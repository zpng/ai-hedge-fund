import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

export function Login() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  const { sendVerificationCode, login } = useAuth();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('请输入手机号');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await sendVerificationCode(phone);
      setCodeSent(true);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送验证码失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入验证码');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(phone, code, inviteCode || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setCode('');
    setError('');
    setCodeSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            AI对冲基金
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' ? '请输入手机号获取验证码' : '请输入验证码登录'}
          </p>
        </div>

        <Card className="p-8">
          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  手机号
                </label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700">
                  邀请码 (可选)
                </label>
                <Input
                  id="inviteCode"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="输入邀请码可获得5次免费试用"
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? '发送中...' : '发送验证码'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  验证码
                </label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入6位验证码"
                  className="mt-1"
                  maxLength={6}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  验证码已发送至 {phone}
                </p>
              </div>

              {error && (
                <div className="text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1"
                >
                  返回
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? '验证中...' : '登录'}
                </Button>
              </div>
            </form>
          )}
        </Card>

        <div className="text-center text-sm text-gray-600">
          <p>首次登录自动注册账户</p>
          <p>使用邀请码注册可获得5次免费API调用</p>
        </div>
      </div>
    </div>
  );
}