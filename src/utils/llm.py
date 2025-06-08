"""Helper functions for LLM"""

import json
import logging
from typing import TypeVar, Type, Optional, Any
from pydantic import BaseModel
from src.llm.models import get_model, get_model_info
from src.utils.progress import progress

# 获取日志记录器
logger = logging.getLogger("ai-hedge-fund")

T = TypeVar("T", bound=BaseModel)
from src.graph.state import AgentState


def call_llm(
    prompt: any,
    pydantic_model: type[BaseModel],
    agent_name: str | None = None,
    state: AgentState | None = None,
    max_retries: int = 3,
    default_factory=None,
) -> BaseModel:
    """
    Makes an LLM call with retry logic, handling both JSON supported and non-JSON supported models.

    Args:
        prompt: The prompt to send to the LLM
        pydantic_model: The Pydantic model class to structure the output
        agent_name: Optional name of the agent for progress updates and model config extraction
        state: Optional state object to extract agent-specific model configuration
        max_retries: Maximum number of retries (default: 3)
        default_factory: Optional factory function to create default response on failure

    Returns:
        An instance of the specified Pydantic model
    """

    # Extract model configuration if state is provided and agent_name is available
    if state and agent_name:
        model_name, model_provider = get_agent_model_config(state, agent_name)

    # Fallback to defaults if still not provided
    if not model_name:
        model_name = "gpt-4o"
    if not model_provider:
        model_provider = "OPENAI"

    logger.info(f"开始LLM调用: model_name={model_name}, model_provider={model_provider}")

    model_info = get_model_info(model_name, model_provider)
    logger.info(f"获取到模型信息: {model_info}")

    try:
        llm = get_model(model_name, model_provider)
        logger.info(f"成功初始化LLM模型实例")
    except Exception as e:
        logger.error(f"初始化LLM模型失败: {str(e)}\n详细错误: {json.dumps({'model_name': model_name, 'model_provider': model_provider, 'error': str(e)})}")
        if default_factory:
            return default_factory()
        return create_default_response(pydantic_model)

    # For non-JSON support models, we can use structured output
    if not (model_info and not model_info.has_json_mode()):
        logger.info(f"使用JSON模式进行结构化输出")
        llm = llm.with_structured_output(
            pydantic_model,
            method="json_mode",
        )

    # Call the LLM with retries
    for attempt in range(max_retries):
        try:
            logger.info(f"尝试调用LLM (尝试 {attempt + 1}/{max_retries})")
            # Call the LLM
            result = llm.invoke(prompt)
            logger.info(f"LLM调用成功")

            # For non-JSON support models, we need to extract and parse the JSON manually
            if model_info and not model_info.has_json_mode():
                logger.info(f"从响应中提取JSON")
                parsed_result = extract_json_from_response(result.content)
                if parsed_result:
                    logger.info(f"成功解析JSON响应")
                    return pydantic_model(**parsed_result)
                else:
                    logger.error(f"无法从响应中提取JSON: {result.content[:200]}...")
            else:
                logger.info(f"直接返回结构化结果")
                return result

        except Exception as e:
            error_msg = f"LLM调用错误 (尝试 {attempt + 1}/{max_retries}): {str(e)}"
            logger.error(f"{error_msg}\n详细错误信息: {json.dumps({'model_name': model_name, 'model_provider': model_provider, 'attempt': attempt + 1, 'error': str(e)})}")

            if agent_name:
                progress.update_status(agent_name, None, f"Error - retry {attempt + 1}/{max_retries}")

            if attempt == max_retries - 1:
                logger.error(f"LLM调用在{max_retries}次尝试后失败: {str(e)}")
                # Use default_factory if provided, otherwise create a basic default
                if default_factory:
                    return default_factory()
                return create_default_response(pydantic_model)

    # This should never be reached due to the retry logic above
    logger.warning("意外情况: 达到了不应该到达的代码点，返回默认响应")
    return create_default_response(pydantic_model)


def create_default_response(model_class: type[BaseModel]) -> BaseModel:
    """Creates a safe default response based on the model's fields."""
    default_values = {}
    for field_name, field in model_class.model_fields.items():
        if field.annotation == str:
            default_values[field_name] = "Error in analysis, using default"
        elif field.annotation == float:
            default_values[field_name] = 0.0
        elif field.annotation == int:
            default_values[field_name] = 0
        elif hasattr(field.annotation, "__origin__") and field.annotation.__origin__ == dict:
            default_values[field_name] = {}
        else:
            # For other types (like Literal), try to use the first allowed value
            if hasattr(field.annotation, "__args__"):
                default_values[field_name] = field.annotation.__args__[0]
            else:
                default_values[field_name] = None

    return model_class(**default_values)


def extract_json_from_response(content: str) -> dict | None:
    """Extracts JSON from markdown-formatted response."""
    try:
        logger.info(f"尝试从响应中提取JSON")
        json_start = content.find("```json")
        if json_start != -1:
            json_text = content[json_start + 7 :]  # Skip past ```json
            json_end = json_text.find("```")
            if json_end != -1:
                json_text = json_text[:json_end].strip()
                parsed_json = json.loads(json_text)
                logger.info(f"成功从响应中提取JSON")
                return parsed_json
            else:
                logger.warning(f"在响应中找不到JSON结束标记```")
        else:
            logger.warning(f"在响应中找不到JSON开始标记```json")
    except Exception as e:
        logger.error(f"从响应中提取JSON时出错: {str(e)}\n响应内容: {content[:200]}...")
    return None


def get_agent_model_config(state, agent_name):
    """
    Get model configuration for a specific agent from the state.
    Falls back to global model configuration if agent-specific config is not available.
    """
    request = state.get("metadata", {}).get("request")

    if agent_name == 'portfolio_manager':
        # Get the model and provider from state metadata
        model_name = state.get("metadata", {}).get("model_name", "gpt-4o")
        model_provider = state.get("metadata", {}).get("model_provider", "OPENAI")
        return model_name, model_provider

    if request and hasattr(request, 'get_agent_model_config'):
        # Get agent-specific model configuration
        model_name, model_provider = request.get_agent_model_config(agent_name)
        return model_name, model_provider.value if hasattr(model_provider, 'value') else str(model_provider)

    # Fall back to global configuration
    model_name = state.get("metadata", {}).get("model_name", "gpt-4o")
    model_provider = state.get("metadata", {}).get("model_provider", "OPENAI")

    # Convert enum to string if necessary
    if hasattr(model_provider, 'value'):
        model_provider = model_provider.value

    return model_name, model_provider
