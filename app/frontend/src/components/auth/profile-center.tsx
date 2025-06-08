import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { User, Gift, CreditCard, TrendingUp, Receipt } from 'lucide-react';

interface InviteCode {
  code: string;
  user_id: string;
  created_at: string;
  used_at?: string;
  used_by?: string;
  used_by_email?: string;
  is_active: boolean;
}

interface PaymentRecord {
  id: string;
  trade_order_id: string;
  amount: number;
  subscription_type: string;
  status: string;
  created_at: string;
  paid_at?: string;
  start_time?: string;
  end_time?: string;
  is_active: boolean;
  payment_method?: string;
}

interface UserProfile {
  user: any;
  invite_codes: InviteCode[];
  subscription_info: {
    type: string;
    expires_at?: string;
    api_calls_remaining: number;
    total_api_calls: number;
    new_user_gift_calls: number;
    invite_gift_calls: number;
  };
}

interface ProfileCenterProps {
  onGoToComponents?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const menuItems = [
  { id: 'account', label: '账户信息', icon: User },
  { id: 'invite', label: '邀请码管理', icon: Gift },
  { id: 'subscription', label: '订阅管理', icon: CreditCard },
  { id: 'records', label: '购买记录', icon: Receipt },
  { id: 'analysis', label: '股票分析', icon: TrendingUp },
];

export function ProfileCenter({ onGoToComponents: _onGoToComponents }: ProfileCenterProps) {
  const { user: _user, token, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
  const [clearEmail, setClearEmail] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly'); // 默认选中年付会员
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || '获取用户信息失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "获取信息失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateInviteCodes = async () => {
    if (!token) return;

    setIsGeneratingCodes(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/generate-invite-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchProfile();
        toast({
          title: "生成成功",
          description: "邀请码已生成",
        });
      } else {
        const error = await response.json();
        const errorMessage = error.detail || '生成邀请码失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "生成失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const clearUserData = async () => {
    if (!token || !clearEmail.trim()) {
      toast({
        variant: "destructive",
        title: "输入错误",
        description: "请输入要清空数据的邮箱地址",
      });
      return;
    }

    // 确认操作
    if (!window.confirm(`确定要清空邮箱 ${clearEmail} 的所有数据吗？此操作不可撤销！`)) {
      return;
    }

    setIsClearingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/clear-user-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: clearEmail }),
      });

      if (response.ok) {
        const result = await response.json();
        setClearEmail('');
        toast({
          title: "清空成功",
          description: result.message,
        });
      } else {
        const error = await response.json();
        const errorMessage = error.detail || '清空用户数据失败';
        toast({
          variant: "destructive",
          title: "清空失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsClearingData(false);
    }
  };

  const subscribe = async (subscriptionType: 'monthly' | 'yearly') => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payment/create?subscription_type=${subscriptionType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data.payment_url) {
          window.open(result.data.payment_url, '_blank');
          const tradeOrderId = result.data.trade_order_id;
          startPollingPaymentStatus(tradeOrderId);
        } else {
          const errorMessage = '获取支付链接失败';
          setError(errorMessage);
          toast({
            variant: "destructive",
            title: "支付失败",
            description: errorMessage,
          });
        }
      } else {
        const error = await response.json();
        const errorMessage = error.detail || '创建支付订单失败';
        setError(errorMessage);
        toast({
          variant: "destructive",
          title: "支付失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      const errorMessage = '网络错误';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    }
  };

  const startPollingPaymentStatus = (tradeOrderId: string) => {
    const pollInterval = 3000;
    const maxAttempts = 20;
    let attempts = 0;
    
    const pollPaymentStatus = async () => {
      if (attempts >= maxAttempts) {
        toast({
          variant: "destructive",
          title: "支付状态查询超时",
          description: "请稍后在个人中心查看订阅状态",
        });
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/payment/query/${tradeOrderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.status === 'success' && result.data) {
            if (result.data.status === 'OD') {
              await refreshUser();
              await fetchProfile();
              // 刷新购买记录
              if (activeSection === 'records') {
                await fetchPaymentRecords();
              }
              toast({
                title: "支付成功",
                description: "订阅已更新，感谢您的支持！",
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error('查询支付状态出错:', err);
      }
      
      attempts++;
      setTimeout(pollPaymentStatus, pollInterval);
    };
    
    setTimeout(pollPaymentStatus, pollInterval);
  };

  const fetchPaymentRecords = async () => {
    if (!token) return;

    setIsLoadingRecords(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payment/records`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === 'success' && result.data) {
          setPaymentRecords(result.data.records || []);
        } else {
          const errorMessage = result.message || '获取购买记录失败';
          toast({
            variant: "destructive",
            title: "获取失败",
            description: errorMessage,
          });
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || '获取购买记录失败';
        toast({
          variant: "destructive",
          title: "获取失败",
          description: errorMessage,
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "网络错误",
        description: "请检查网络连接后重试",
      });
    } finally {
      setIsLoadingRecords(false);
    }
  };

  // 点击导航项切换内容区域
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
    // 如果切换到购买记录页面，自动加载数据
    if (sectionId === 'records' && paymentRecords.length === 0) {
      fetchPaymentRecords();
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">加载用户信息失败</div>
      </div>
    );
  }

  const getSubscriptionBadgeColor = (type: string) => {
    switch (type) {
      case 'yearly': return 'bg-purple-100 text-purple-800';
      case 'monthly': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubscriptionText = (type: string) => {
    switch (type) {
      case 'yearly': return '年付会员';
      case 'monthly': return '月付会员';
      case 'trial': return '试用版';
      default: return type;
    }
  };

  const handleGoToComponents = () => {
    try {
      navigate('/components');
    } catch (err) {
      toast({
        variant: "destructive",
        title: "导航失败",
        description: "页面跳转失败，请重试",
      });
    }
  };

  const handleLogout = () => {
    try {
      logout();
      toast({
        title: "已退出登录",
        description: "您已成功退出登录",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "退出失败",
        description: "退出登录失败，请重试",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧导航栏 */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
        {/* 用户头像和基本信息 */}
        <div className="p-6 border-b border-gray-200">
          <div>
            <div className="font-semibold text-gray-900">
              {'AI股票分析'}
            </div>
            <div className="text-sm text-gray-500">
              {profile.user.email || 'zhangpeng.eic@bytedance.com'}
            </div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleSectionChange(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 底部操作按钮 */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button 
            onClick={handleLogout} 
            variant="outline"
            className="w-full"
            size="sm"
          >
            退出登录
          </Button>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-6">
              <div className="text-red-600">{error}</div>
            </div>
          )}

          {/* 账户信息 */}
          {activeSection === 'account' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">账户信息</h2>
              <Card className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                    <div className="text-lg text-gray-900">{profile.user.email || 'zhangpeng.eic@bytedance.com'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">注册时间</label>
                    <div className="text-lg text-gray-900">
                      {new Date(profile.user.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">订阅状态</label>
                    <Badge className={getSubscriptionBadgeColor(profile.subscription_info.type)}>
                      {getSubscriptionText(profile.subscription_info.type)}
                    </Badge>
                  </div>
                  {profile.subscription_info.expires_at && profile.subscription_info.type !== 'trial' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">到期时间</label>
                      <div className="text-lg text-gray-900">
                        {(() => {
                          const date = new Date(profile.subscription_info.expires_at);
                          // 手动添加8小时偏移量
                          const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
                          return beijingTime.toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'Asia/Shanghai',
                            timeZoneName: 'long'
                          }).replace('协调世界时', 'CST');
                        })()}
                      </div>
                      {new Date(profile.subscription_info.expires_at) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                        <div className="text-sm text-orange-600 mt-1">
                          ⚠️ 您的订阅即将到期，请及时续费
                        </div>
                      )}
                    </div>
                  )}
                  {profile.subscription_info.type === 'trial' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">剩余API调用次数</label>
                      <div className="text-lg text-gray-900 relative group">
                        <span className="cursor-help">{profile.subscription_info.api_calls_remaining}</span>
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-10">
                          <div>新用户赠送: {profile.subscription_info.new_user_gift_calls} 次</div>
                          <div>邀请码赠送: {profile.subscription_info.invite_gift_calls} 次</div>
                          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 管理员功能：清空用户数据 */}
                {profile.user.email === '1014346275@qq.com' && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">管理员功能</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-md font-medium text-red-800 mb-3">清空用户数据</h4>
                      <p className="text-sm text-red-600 mb-4">
                        ⚠️ 警告：此操作将永久删除指定用户的所有数据，包括账户信息、邀请码、会话等，操作不可撤销！
                      </p>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          placeholder="输入要清空数据的邮箱地址"
                          value={clearEmail}
                          onChange={(e) => setClearEmail(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        />
                        <Button
                          onClick={clearUserData}
                          disabled={isClearingData || !clearEmail.trim()}
                          variant="destructive"
                        >
                          {isClearingData ? '清空中...' : '清空数据'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* 邀请码管理 */}
          {activeSection === 'invite' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">邀请码管理</h2>
                {profile.invite_codes.length === 0 && (
                  <Button 
                    onClick={generateInviteCodes} 
                    disabled={isGeneratingCodes}
                  >
                    {isGeneratingCodes ? '生成中...' : '生成邀请码'}
                  </Button>
                )}
              </div>
              <Card className="p-6">
                <div className="space-y-4">
                  {profile.invite_codes.map((code) => (
                    <div key={code.code} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-mono text-lg font-semibold">{code.code}</div>
                        <div className="text-sm text-gray-600">
                          创建于 {new Date(code.created_at).toLocaleDateString('zh-CN')}
                        </div>
                        {code.used_at && code.used_by_email && (
                          <div className="text-sm text-blue-600 mt-1">
                            被 {code.used_by_email} 使用于 {new Date(code.used_at).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </div>
                      <div>
                        {code.used_at ? (
                          <Badge variant="secondary">已使用</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">可用</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {profile.invite_codes.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      暂无邀请码，点击生成按钮创建
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* 订阅管理 */}
          {activeSection === 'subscription' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">订阅管理</h2>
              <Card className="p-6">
                {profile.subscription_info.type === 'trial' ? (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">升级到付费版本</h3>
                      <p className="text-gray-600">享受无限API调用和更多高级功能</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`border rounded-lg p-6 transition-colors cursor-pointer ${
                          selectedPlan === 'monthly' 
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedPlan('monthly')}
                      >
                        <div className="text-center">
                          <h4 className="text-lg font-semibold mb-2">月付会员</h4>
                          <div className="text-3xl font-bold text-blue-600 mb-4">¥66<span className="text-sm text-gray-500">/首月</span></div>
                          <div className="text-sm text-gray-500 mb-4">之后每月¥88</div>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              subscribe('monthly');
                            }}
                            className="w-full"
                            variant={selectedPlan === 'monthly' ? 'default' : 'outline'}
                          >
                            立即订阅
                          </Button>
                        </div>
                      </div>
                      <div 
                        className={`border rounded-lg p-6 relative transition-colors cursor-pointer ${
                          selectedPlan === 'yearly'
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                        onClick={() => setSelectedPlan('yearly')}
                      >
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">推荐</span>
                        </div>
                        <div className="text-center">
                          <h4 className="text-lg font-semibold mb-2">年付会员</h4>
                          <div className="text-3xl font-bold text-blue-600 mb-2">¥880<span className="text-sm text-gray-500">/首年</span></div>
                          <div className="text-sm text-gray-500 mb-2">之后每年¥968</div>
                          <div className="text-sm text-green-600 mb-4">相比月付节省¥176</div>
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              subscribe('yearly');
                            }}
                            className={`w-full ${
                              selectedPlan === 'yearly' 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                          >
                            立即订阅
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">您已是付费用户</h3>
                    <p className="text-gray-600">享受无限API调用和所有高级功能</p>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* 购买记录 */}
          {activeSection === 'records' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">购买记录</h2>
                <Button 
                  onClick={fetchPaymentRecords}
                  disabled={isLoadingRecords}
                  variant="outline"
                  size="sm"
                >
                  {isLoadingRecords ? '刷新中...' : '刷新'}
                </Button>
              </div>
              <Card className="p-6">
                {isLoadingRecords ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : paymentRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>暂无购买记录</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentRecords.map((record) => (
                      <div key={record.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {record.subscription_type === 'monthly' ? '月付会员' : '年付会员'}
                            </h4>
                            <p className="text-sm text-gray-500">订单号: {record.trade_order_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">¥{record.amount}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              record.status === 'paid' 
                                ? 'bg-green-100 text-green-800' 
                                : record.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status === 'paid' ? '已支付' : 
                               record.status === 'pending' ? '待支付' : '已取消'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">购买时间:</span>
                            <p className="font-medium">
                              {new Date(record.created_at).toLocaleString('zh-CN')}
                            </p>
                          </div>
                          
                          {record.start_time && (
                            <div>
                              <span className="text-gray-500">开始时间:</span>
                              <p className="font-medium">
                                {new Date(record.start_time).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          )}
                          
                          {record.end_time && (
                            <div>
                              <span className="text-gray-500">结束时间:</span>
                              <p className="font-medium">
                                {new Date(record.end_time).toLocaleString('zh-CN')}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {record.status === 'paid' && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">订阅状态:</span>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                record.is_active 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {record.is_active ? '生效中' : '已过期'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* 股票分析 */}
          {activeSection === 'analysis' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">股票分析</h2>
              <Card className="p-6">
                <div className="text-center py-8">
                  <TrendingUp className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">AI股票分析工具</h3>
                  <p className="text-gray-600 mb-4">使用先进的AI技术分析股票趋势和投资机会</p>
                  <Button onClick={handleGoToComponents} className="bg-blue-600 hover:bg-blue-700">
                    开始分析
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileCenter;