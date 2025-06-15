import json
import os
import logging
from enum import Enum
from pathlib import Path
from typing import Tuple, List

from langchain_anthropic import ChatAnthropic
from langchain_deepseek import ChatDeepSeek
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from pydantic import BaseModel

# 获取日志记录器
logger = logging.getLogger("ai-hedge-fund")


class ModelProvider(str, Enum):
    """Enum for supported LLM providers"""

    ANTHROPIC = "Anthropic"
    DEEPSEEK = "DeepSeek"
    GEMINI = "Gemini"
    GROQ = "Groq"
    OPENAI = "OpenAI"
    OLLAMA = "Ollama"


class LLMModel(BaseModel):
    """Represents an LLM model configuration"""

    display_name: str
    model_name: str
    provider: ModelProvider

    def to_choice_tuple(self) -> Tuple[str, str, str]:
        """Convert to format needed for questionary choices"""
        return (self.display_name, self.model_name, self.provider.value)

    def is_custom(self) -> bool:
        """Check if the model is a Gemini model"""
        return self.model_name == "-"

    def has_json_mode(self) -> bool:
        """Check if the model supports JSON mode"""
        if self.is_deepseek() or self.is_gemini():
            return False
        # Only certain Ollama models support JSON mode
        if self.is_ollama():
            return "llama3" in self.model_name or "neural-chat" in self.model_name
        return True

    def is_deepseek(self) -> bool:
        """Check if the model is a DeepSeek model"""
        return self.model_name.startswith("deepseek")

    def is_gemini(self) -> bool:
        """Check if the model is a Gemini model"""
        return self.model_name.startswith("gemini")

    def is_ollama(self) -> bool:
        """Check if the model is an Ollama model"""
        return self.provider == ModelProvider.OLLAMA


# Load models from JSON file
def load_models_from_json(json_path: str) -> List[LLMModel]:
    """Load models from a JSON file"""
    with open(json_path, 'r') as f:
        models_data = json.load(f)

    models = []
    for model_data in models_data:
        # Convert string provider to ModelProvider enum
        provider_enum = ModelProvider(model_data["provider"])
        models.append(
            LLMModel(
                display_name=model_data["display_name"],
                model_name=model_data["model_name"],
                provider=provider_enum
            )
        )
    return models


# Get the path to the JSON files
current_dir = Path(__file__).parent
models_json_path = current_dir / "api_models.json"
ollama_models_json_path = current_dir / "ollama_models.json"

# Load available models from JSON
AVAILABLE_MODELS = load_models_from_json(str(models_json_path))

# Load Ollama models from JSON
OLLAMA_MODELS = load_models_from_json(str(ollama_models_json_path))

# Create LLM_ORDER in the format expected by the UI
LLM_ORDER = [model.to_choice_tuple() for model in AVAILABLE_MODELS]

# Create Ollama LLM_ORDER separately
OLLAMA_LLM_ORDER = [model.to_choice_tuple() for model in OLLAMA_MODELS]


def get_model_info(model_name: str, model_provider: str) -> LLMModel | None:
    """Get model information by model_name"""
    logger.info(f"获取模型信息: model_name={model_name}, model_provider={model_provider}")
    all_models = AVAILABLE_MODELS + OLLAMA_MODELS
    model = next((model for model in all_models if model.model_name == model_name and model.provider == model_provider),
                None)
    if model:
        logger.info(f"找到模型信息: {model}")
    else:
        logger.warning(f"未找到模型信息: model_name={model_name}, model_provider={model_provider}")
    return model


def get_models_list():
    """Get the list of models for API responses."""
    return [
        {
            "display_name": model.display_name,
            "model_name": model.model_name,
            "provider": model.provider.value
        }
        for model in AVAILABLE_MODELS
    ]


def get_model(model_name: str, model_provider: ModelProvider) -> ChatOpenAI | ChatGroq | ChatOllama | None:
    logger.info(f"初始化模型: model_name={model_name}, model_provider={model_provider}")
    base_url = os.getenv("MODEL_BASE_URL")
    if base_url:
        logger.info(f"使用自定义BASE_URL: {base_url}")
    
    if model_provider == ModelProvider.GROQ:
        logger.info(f"初始化Groq模型: {model_name}")
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            error_msg = "Groq API key not found. Please make sure GROQ_API_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        logger.info(f"成功获取Groq API密钥")
        return ChatGroq(model=model_name, api_key=api_key, base_url=base_url)
    elif model_provider == ModelProvider.OPENAI:
        logger.info(f"初始化OpenAI模型: {model_name}")
        # Get and validate API key
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            error_msg = "OpenAI API key not found. Please make sure OPENAI_API_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        logger.info(f"成功获取OpenAI API密钥")
        try:
            model = ChatOpenAI(model=model_name, api_key=api_key, base_url=base_url)
            logger.info(f"成功初始化OpenAI模型")
            return model
        except Exception as e:
            logger.error(f"初始化OpenAI模型失败: {str(e)}")
            raise
    elif model_provider == ModelProvider.ANTHROPIC:
        logger.info(f"初始化Anthropic模型: {model_name}")
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            error_msg = "Anthropic API key not found. Please make sure ANTHROPIC_API_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        logger.info(f"成功获取Anthropic API密钥")
        try:
            model = ChatAnthropic(model=model_name, api_key=api_key, base_url=base_url)
            logger.info(f"成功初始化Anthropic模型")
            return model
        except Exception as e:
            logger.error(f"初始化Anthropic模型失败: {str(e)}")
            raise
    elif model_provider == ModelProvider.DEEPSEEK:
        logger.info(f"初始化DeepSeek模型: {model_name}")
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            error_msg = "DeepSeek API key not found. Please make sure DEEPSEEK_API_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        logger.info(f"成功获取DeepSeek API密钥")
        try:
            model = ChatDeepSeek(model=model_name, api_key=api_key, base_url=base_url)
            logger.info(f"成功初始化DeepSeek模型")
            return model
        except Exception as e:
            logger.error(f"初始化DeepSeek模型失败: {str(e)}")
            raise
    elif model_provider == ModelProvider.GEMINI:
        logger.info(f"初始化Gemini模型: {model_name}")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            error_msg = "Google API key not found. Please make sure GOOGLE_API_KEY is set in your .env file."
            logger.error(error_msg)
            raise ValueError(error_msg)
        logger.info(f"成功获取Google API密钥")
        try:
            model = ChatGoogleGenerativeAI(model=model_name, api_key=api_key)
            logger.info(f"成功初始化Gemini模型")
            return model
        except Exception as e:
            logger.error(f"初始化Gemini模型失败: {str(e)}")
            raise
    elif model_provider == ModelProvider.OLLAMA:
        logger.info(f"初始化Ollama模型: {model_name}")
        # For Ollama, we use a base URL instead of an API key
        # Check if OLLAMA_HOST is set (for Docker on macOS)
        ollama_host = os.getenv("OLLAMA_HOST", "localhost")
        base_url = os.getenv("OLLAMA_BASE_URL", f"http://{ollama_host}:11434")
        logger.info(f"使用Ollama基础URL: {base_url}")
        try:
            model = ChatOllama(
                model=model_name,
                base_url=base_url,
            )
            logger.info(f"成功初始化Ollama模型")
            return model
        except Exception as e:
            logger.error(f"初始化Ollama模型失败: {str(e)}")
            raise
    
    error_msg = f"不支持的模型提供商: {model_provider}"
    logger.error(error_msg)
    raise ValueError(error_msg)
