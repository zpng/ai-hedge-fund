import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { User, Gift, CreditCard, TrendingUp } from 'lucide-react';

interface InviteCode {
  code: string;
  user_id: string;
  created_at: string;
  used_at?: string;
  used_by?: string;
  is_active: boolean;
}

interface UserProfile {
  user: any;
  invite_codes: InviteCode[];
  subscription_info: {
    type: string;
    expires_at?: string;
    api_calls_remaining: number;
    total_api_calls: number;
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
  { id: 'analysis', label: '股票分析', icon: TrendingUp },
];

export function ProfileCenter({ onGoToComponents: _onGoToComponents }: ProfileCenterProps) {
  const { user: _user, token, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const [activeSection, setActiveSection] = useState('account');
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

  // 点击导航项切换内容区域
  const handleSectionChange = (sectionId: string) => {
    setActiveSection(sectionId);
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
                  {profile.subscription_info.type === 'trial' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">剩余API调用次数</label>
                      <div className="text-lg text-gray-900">
                        {profile.subscription_info.api_calls_remaining}
                      </div>
                    </div>
                  )}
                </div>
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
                      <div>
                        <div className="font-mono text-lg font-semibold">{code.code}</div>
                        <div className="text-sm text-gray-600">
                          创建于 {new Date(code.created_at).toLocaleDateString('zh-CN')}
                        </div>
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
                      <div className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors">
                        <div className="text-center">
                          <h4 className="text-lg font-semibold mb-2">月付会员</h4>
                          <div className="text-3xl font-bold text-blue-600 mb-4">¥66<span className="text-sm text-gray-500">/首月</span></div>
                          <div className="text-sm text-gray-500 mb-4">之后每月¥88</div>
                          <Button 
                            onClick={() => subscribe('monthly')}
                            className="w-full"
                            variant="outline"
                          >
                            立即订阅
                          </Button>
                        </div>
                      </div>
                      <div className="border border-blue-300 rounded-lg p-6 bg-blue-50 relative">
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">推荐</span>
                        </div>
                        <div className="text-center">
                          <h4 className="text-lg font-semibold mb-2">年付会员</h4>
                          <div className="text-3xl font-bold text-blue-600 mb-2">¥880<span className="text-sm text-gray-500">/首年</span></div>
                          <div className="text-sm text-gray-500 mb-2">之后每年¥968</div>
                          <div className="text-sm text-green-600 mb-4">相比月付节省¥176</div>
                          <Button 
                            onClick={() => subscribe('yearly')}
                            className="w-full bg-blue-600 hover:bg-blue-700"
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

          {/* 股票分析 */}
          {activeSection === 'analysis' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">股票分析</h2>
              <Card className="p-6">
                <div className="text-center py-8">
                  <TrendingUp className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">AI股票分析工具</h3>
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