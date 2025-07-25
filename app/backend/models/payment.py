from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class PaymentStatus(str, Enum):
    PENDING = "pending"  # 待支付
    SUCCESS = "success"  # 支付成功
    FAILED = "failed"    # 支付失败
    REFUNDED = "refunded"  # 已退款


class XunhuPayRequest(BaseModel):
    """虎皮椒支付请求参数"""
    version: str = "1.1"  # 接口版本号
    appid: str  # 商户应用ID
    trade_order_id: str  # 商户订单号
    total_fee: float  # 支付金额
    title: str  # 商品标题
    time: int  # 发起时间，格式YmdHis
    notify_url: str  # 异步通知地址
    return_url: Optional[str] = None  # 同步通知地址
    callback_url: Optional[str] = None  # 点击关闭按钮后的跳转地址
    mchid: str = None  # 商户号
    nonce_str: str = None  # 随机字符串
    type: str = None  # 支付类型，如wechat、alipay
    wap_name: Optional[str] = None  # WAP网站名称
    wap_url: Optional[str] = None  # WAP网站URL
    hash: str  # 签名，由系统生成


class XunhuPayResponse(BaseModel):
    """虎皮椒支付响应参数"""
    errcode: int  # 状态码，0表示成功
    errmsg: str  # 状态信息
    hash: Optional[str] = None  # 签名，由系统生成
    url: Optional[str] = None  # 支付链接
    url_qrcode: Optional[str] = None  # 支付链接
    oderid: Optional[int] = None  # 平台订单号


class XunhuQueryRequest(BaseModel):
    """虎皮椒订单查询请求参数
    
    根据虎皮椒接口文档：
    - appid: APP ID (必填)
    - out_trade_order: 商户网站订单号 (与open_order_id二选一)
    - open_order_id: 虎皮椒内部订单号 (与out_trade_order二选一)
    - time: 当前时间戳 (必填)
    - nonce_str: 随机值 (必填)
    - hash: 签名 (必填)
    """
    appid: str  # 商户应用ID
    out_trade_order: Optional[str] = None  # 商户网站订单号
    open_order_id: Optional[str] = None  # 虎皮椒内部订单号
    time: int  # 当前时间戳
    nonce_str: str  # 随机字符串
    hash: str  # 签名，由系统生成


class XunhuQueryResponse(BaseModel):
    """虎皮椒订单查询响应参数"""
    errcode: int  # 状态码，0表示成功
    errmsg: str  # 状态信息
    data: Optional[dict] = None  # 订单数据
    hash: Optional[str] = None  # 签名


class PaymentNotification(BaseModel):
    """支付回调通知参数"""
    status: str  # 支付状态
    trade_order_id: str  # 商户订单号
    transaction_id: str  # 平台订单号
    openid: Optional[str] = None  # 用户标识
    total_fee: float  # 支付金额
    payment_method: str  # 支付方式
    nonce_str: str  # 随机字符串
    timestamp: str  # 时间戳
    hash: str  # 签名


class PaymentRecord(BaseModel):
    """支付记录"""
    id: str  # 记录ID
    user_id: str  # 用户ID
    trade_order_id: str  # 商户订单号
    transaction_id: Optional[str] = None  # 平台订单号
    amount: float  # 支付金额
    subscription_type: str  # 订阅类型
    status: PaymentStatus  # 支付状态
    created_at: datetime  # 创建时间
    paid_at: Optional[datetime] = None  # 支付时间
    payment_method: Optional[str] = None  # 支付方式
    payment_url: Optional[str] = None  # 支付链接