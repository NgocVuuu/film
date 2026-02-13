'use client';

import { useState, useEffect } from 'react';
import { Download, Wifi, Bell, Check, X, Loader2, WifiOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { usePWA } from '@/hooks/usePWA';
import { toast } from 'react-hot-toast';
import { 
  subscribeToPush, 
  unsubscribeFromPush, 
  isPushSupported,
  getNotificationPermission 
} from '../lib/push-notifications';

export function PWASettings() {
  const { isInstallable, isInstalled, promptInstall } = useInstallPrompt();
  const { isOnline, isStandalone } = usePWA();
  const [installing, setInstalling] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Check notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      // Check if already subscribed
      const checkSubscription = async () => {
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setPushEnabled(subscription !== null);
        }
      };
      checkSubscription();
    }
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const success = await promptInstall();
      if (success) {
        toast.success('Đã cài đặt app thành công!');
      } else {
        toast.error('Hủy cài đặt');
      }
    } catch (error) {
      console.error('Install error:', error);
      toast.error('Không thể cài đặt app');
    } finally {
      setInstalling(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!isPushSupported()) {
      toast.error('Trình duyệt không hỗ trợ thông báo push');
      return;
    }

    setPushLoading(true);
    try {
      if (enabled) {
        const permission = await getNotificationPermission();
        if (permission === 'granted') {
          await subscribeToPush();
          setPushEnabled(true);
          setNotificationPermission('granted');
          toast.success('Đã bật thông báo push');
        } else if (permission === 'denied') {
          toast.error('Bạn đã chặn thông báo. Vui lòng bật lại trong cài đặt trình duyệt.');
          setNotificationPermission('denied');
        } else {
          toast.error('Bạn cần cho phép thông báo');
        }
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast.success('Đã tắt thông báo push');
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((error as any).requiresPremium) {
        toast.error('Tính năng này chỉ dành cho thành viên Premium');
      } else {
        toast.error(enabled ? 'Không thể bật thông báo' : 'Không thể tắt thông báo');
      }
      setPushEnabled(!enabled);
    } finally {
      setPushLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Online/Offline Status */}
      <div className={`p-3 rounded-lg border ${isOnline ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-400 font-medium">Đang online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-500" />
              <span className="text-red-400 font-medium">Đang offline</span>
            </>
          )}
        </div>
      </div>

      {/* Install App Section */}
      <div className="p-4 rounded-xl bg-surface-900/50 border border-white/10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-primary/20 rounded-lg mt-0.5">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Cài đặt ứng dụng</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {isInstalled || isStandalone 
                  ? 'App đã được cài đặt trên thiết bị của bạn'
                  : 'Thêm vào màn hình chính để truy cập nhanh'
                }
              </p>
            </div>
          </div>
          {isInstalled || isStandalone ? (
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Check className="w-5 h-5 text-green-500" />
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              disabled={!isInstallable || installing}
              size="sm"
              className="ml-2"
            >
              {installing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Cài đặt'
              )}
            </Button>
          )}
        </div>
        {!isInstallable && !isInstalled && !isStandalone && (
          <p className="text-xs text-gray-500 mt-2">
            App chưa thể cài đặt. Hãy thử sử dụng Chrome hoặc Edge.
          </p>
        )}
      </div>

      {/* Push Notifications Section */}
      <div className="p-4 rounded-xl bg-surface-900/50 border border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-primary/20 rounded-lg mt-0.5">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Thông báo Push</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-2">
                Nhận thông báo về phim mới, tập mới
              </p>
              {notificationPermission === 'denied' && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <X className="w-3 h-3" />
                  Đã bị chặn - vui lòng bật trong cài đặt trình duyệt
                </p>
              )}
              {notificationPermission === 'granted' && pushEnabled && (
                <p className="text-xs text-green-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Đang hoạt động
                </p>
              )}
            </div>
          </div>
          <Switch
            checked={pushEnabled}
            onCheckedChange={handlePushToggle}
            disabled={pushLoading || notificationPermission === 'denied'}
            className="ml-2"
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-300 leading-relaxed">
          💡 <span className="font-semibold">Mẹo:</span> Sau khi cài app, bạn có thể xem phim ngay cả khi offline (danh sách phim, favorites, history).
        </p>
      </div>
    </div>
  );
}
