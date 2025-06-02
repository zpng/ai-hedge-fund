from langchain_core.messages import HumanMessage
from src.graph.state import AgentState, show_agent_reasoning
from src.utils.progress import progress
import pandas as pd
import numpy as np
import json

from src.tools.api import get_insider_trades, get_company_news


##### Sentiment Agent #####
def sentiment_analyst_agent(state: AgentState):
    """Analyzes market sentiment and generates trading signals for multiple tickers."""
    data = state.get("data", {})
    end_date = data.get("end_date")
    tickers = data.get("tickers")

    # Initialize sentiment analysis for each ticker
    sentiment_analysis = {}

    for ticker in tickers:
        progress.update_status("sentiment_analyst_agent", ticker, "Fetching insider trades")

        # Get the insider trades
        insider_trades = get_insider_trades(
            ticker=ticker,
            end_date=end_date,
            limit=1000,
        )

        progress.update_status("sentiment_analyst_agent", ticker, "Analyzing trading patterns")

        # Get the signals from the insider trades
        transaction_shares = pd.Series([t.transaction_shares for t in insider_trades]).dropna()
        insider_signals = np.where(transaction_shares < 0, "看跌", "看涨").tolist()

        progress.update_status("sentiment_analyst_agent", ticker, "Fetching company news")

        # Get the company news
        company_news = get_company_news(ticker, end_date, limit=100)

        # Get the sentiment from the company news
        sentiment = pd.Series([n.sentiment for n in company_news]).dropna()
        news_signals = np.where(sentiment == "negative", "看跌",
                            np.where(sentiment == "positive", "看涨", "中立")).tolist()
        
        progress.update_status("sentiment_analyst_agent", ticker, "Combining signals")
        # Combine signals from both sources with weights
        insider_weight = 0.3
        news_weight = 0.7
        
        # Calculate weighted signal counts
        bullish_signals = (
        insider_signals.count("看涨") * insider_weight +
        news_signals.count("看涨") * news_weight
    )
    bearish_signals = (
        insider_signals.count("看跌") * insider_weight +
        news_signals.count("看跌") * news_weight
    )

    if bullish_signals > bearish_signals:
        overall_signal = "看涨"
    elif bearish_signals > bullish_signals:
        overall_signal = "看跌"
    else:
        overall_signal = "中立"

        # Calculate confidence level based on the weighted proportion
        total_weighted_signals = len(insider_signals) * insider_weight + len(news_signals) * news_weight
        confidence = 0  # Default confidence when there are no signals
        if total_weighted_signals > 0:
            confidence = round((max(bullish_signals, bearish_signals) / total_weighted_signals) * 100, 2)
        
        # Generate detailed reasoning
        reasoning_parts = []
        reasoning_parts.append(f"情感分析结果: {overall_signal} (置信度: {confidence}%)")
        reasoning_parts.append(f"\n数据来源分析:")
        reasoning_parts.append(f"• 内部人交易: {len(insider_signals)}条记录 (权重: {insider_weight*100}%)")
        reasoning_parts.append(f"  - 看涨信号: {insider_signals.count('看涨')}条")
        reasoning_parts.append(f"  - 看跌信号: {insider_signals.count('看跌')}条")
        reasoning_parts.append(f"• 公司新闻: {len(news_signals)}条记录 (权重: {news_weight*100}%)")
        reasoning_parts.append(f"  - 看涨信号: {news_signals.count('看涨')}条")
        reasoning_parts.append(f"  - 看跌信号: {news_signals.count('看跌')}条")
        reasoning_parts.append(f"  - 中性信号: {news_signals.count('中立')}条")
        reasoning_parts.append(f"\n加权信号统计:")
        reasoning_parts.append(f"• 加权看涨信号: {bullish_signals:.1f}")
        reasoning_parts.append(f"• 加权看跌信号: {bearish_signals:.1f}")
        
        detailed_reasoning = "\n".join(reasoning_parts)

        sentiment_analysis[ticker] = {
            "signal": overall_signal,
            "confidence": confidence,
            "reasoning": detailed_reasoning,
        }

        progress.update_status("sentiment_analyst_agent", ticker, "Done", analysis=detailed_reasoning)

    # Create the sentiment message
    message = HumanMessage(
        content=json.dumps(sentiment_analysis),
        name="sentiment_analyst_agent",
    )

    # Print the reasoning if the flag is set
    if state["metadata"]["show_reasoning"]:
        show_agent_reasoning(sentiment_analysis, "Sentiment Analysis Agent")

    # Add the signal to the analyst_signals list
    state["data"]["analyst_signals"]["sentiment_agent"] = sentiment_analysis

    progress.update_status("sentiment_analyst_agent", None, "Done")

    return {
        "messages": [message],
        "data": data,
    }
