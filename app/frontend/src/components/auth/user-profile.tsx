import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router-dom';

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

interface UserProfileProps {
  onGoToComponents?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function UserProfile({ onGoToComponents }: UserProfileProps) {
  const { user, token, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);
  const navigate = useNavigate();

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
        setError('获取用户信息失败');
      }
    } catch (err) {
      setError('网络错误');
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
        await fetchProfile(); // Refresh profile to get new codes
      } else {
        const error = await response.json();
        setError(error.detail || '生成邀请码失败');
      }
    } catch (err) {
      setError('网络错误');
    } finally {
      setIsGeneratingCodes(false);
    }
  };

  const subscribe = async (subscriptionType: 'monthly' | 'yearly') => {
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription_type: subscriptionType,
          payment_method: 'stripe'
        }),
      });

      if (response.ok) {
        await refreshUser();
        await fetchProfile();
        alert('订阅成功！');
      } else {
        const error = await response.json();
        setError(error.detail || '订阅失败');
      }
    } catch (err) {
      setError('网络错误');
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
    // 直接使用navigate进行导航，不再依赖回调函数
    navigate('/components');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">个人中心</h1>
            <p className="mt-2 text-gray-600">管理您的账户信息和订阅</p>
          </div>
          <Button 
            onClick={handleGoToComponents}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            进入组件页面
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-600">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 用户信息 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">账户信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">手机号</label>
                <div className="mt-1 text-sm text-gray-900">{profile.user.phone}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">注册时间</label>
                <div className="mt-1 text-sm text-gray-900">
                  {new Date(profile.user.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">订阅状态</label>
                <div className="mt-1">
                  <Badge className={getSubscriptionBadgeColor(profile.subscription_info.type)}>
                    {getSubscriptionText(profile.subscription_info.type)}
                  </Badge>
                </div>
              </div>
              {profile.subscription_info.type === 'trial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">剩余API调用次数</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {profile.subscription_info.api_calls_remaining}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* 邀请码管理 */}
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">邀请码管理</h2>
              {profile.invite_codes.length === 0 && (
                <Button 
                  onClick={generateInviteCodes} 
                  disabled={isGeneratingCodes}
                  size="sm"
                >
                  {isGeneratingCodes ? '生成中...' : '生成邀请码'}
                </Button>
              )}
            </div>
            <div className="space-y-3">
              {profile.invite_codes.map((code) => (
                <div key={code.code} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <div className="font-medium">{code.code}</div>
                    <div className="text-sm text-gray-600">
                      创建于 {new Date(code.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div>
                    {code.used_at ? (
                      <Badge variant="secondary">已使用</Badge>
                    ) : (
                      <Badge variant="default">可用</Badge>
                    )}
                  </div>
                </div>
              ))}
              {profile.invite_codes.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  暂无邀请码，点击生成按钮创建
                </div>
              )}
            </div>
          </Card>

          {/* 订阅管理 */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">订阅管理</h2>
            {profile.subscription_info.type === 'trial' ? (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">升级到付费版本，享受无限API调用</p>
                <div className="space-y-3">
                  <Button 
                    onClick={() => subscribe('monthly')}
                    className="w-full"
                    variant="outline"
                  >
                    月付会员 - ¥0.01/月
                  </Button>
                  <Button 
                    onClick={() => subscribe('yearly')}
                    className="w-full"
                  >
                    年付会员 - ¥0.01/年 (省2个月)
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="text-green-600 font-semibold mb-2">您已是付费用户</div>
                <div className="text-gray-600">享受无限API调用服务</div>
              </div>
            )}
          </Card>
        </div>

        <div className="mt-8 text-center">
          <Button onClick={logout} variant="outline">
            退出登录
          </Button>
        </div>
      </div>
    </div>
  );
}