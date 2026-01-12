import { Calendar, Clock, Crown, AlertTriangle } from 'lucide-react';
import { format, differenceInDays, isPast, addDays } from 'date-fns';

interface SubscriptionStatusProps {
  expiresAt: string | null;
  tier: string;
  type: 'user' | 'creator';
  createdAt?: string;
}

const SubscriptionStatus = ({ expiresAt, tier, type, createdAt }: SubscriptionStatusProps) => {
  // Lifetime/platinum users don't expire
  if (tier === 'lifetime' || tier === 'platinum') {
    return (
      <div className="glass-card p-4 border-l-4 border-l-gold">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Lifetime Access</p>
            <p className="text-sm text-muted-foreground">Your subscription never expires</p>
          </div>
        </div>
      </div>
    );
  }

  // Parse expiration date
  const expirationDate = expiresAt ? new Date(expiresAt) : null;
  const now = new Date();
  
  // Calculate days remaining
  const daysRemaining = expirationDate ? differenceInDays(expirationDate, now) : null;
  const isExpired = expirationDate ? isPast(expirationDate) : false;
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;

  // Determine status color
  let borderColor = 'border-l-brand';
  let bgColor = 'bg-brand/20';
  let iconColor = 'text-brand';
  let Icon = Calendar;

  if (isExpired) {
    borderColor = 'border-l-destructive';
    bgColor = 'bg-destructive/20';
    iconColor = 'text-destructive';
    Icon = AlertTriangle;
  } else if (isExpiringSoon) {
    borderColor = 'border-l-amber-500';
    bgColor = 'bg-amber-500/20';
    iconColor = 'text-amber-500';
    Icon = Clock;
  }

  // Format display text
  const getStatusText = () => {
    if (isExpired) {
      return 'Subscription Expired';
    }
    if (type === 'creator') {
      return 'Trial Period';
    }
    return 'Subscription Active';
  };

  const getDetailsText = () => {
    if (isExpired) {
      return `Expired on ${expirationDate ? format(expirationDate, 'PPP') : 'Unknown'}`;
    }
    if (daysRemaining !== null) {
      if (daysRemaining === 0) {
        return 'Expires today';
      }
      if (daysRemaining === 1) {
        return '1 day remaining';
      }
      return `${daysRemaining} days remaining`;
    }
    return 'No expiration set';
  };

  return (
    <div className={`glass-card p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <p className="font-semibold text-foreground">{getStatusText()}</p>
            <p className="text-sm text-muted-foreground">{getDetailsText()}</p>
          </div>
        </div>
        {expirationDate && !isExpired && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Expires</p>
            <p className="text-sm font-medium text-foreground">{format(expirationDate, 'MMM d, yyyy')}</p>
          </div>
        )}
      </div>
      {isExpiringSoon && !isExpired && (
        <div className="mt-3 p-2 bg-amber-500/10 rounded-lg">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            ⚠️ Your {type === 'creator' ? 'trial' : 'subscription'} is expiring soon. {type === 'user' ? 'Consider upgrading to Lifetime for permanent access.' : 'Contact your CMO for renewal.'}
          </p>
        </div>
      )}
      {isExpired && (
        <div className="mt-3 p-2 bg-destructive/10 rounded-lg">
          <p className="text-xs text-destructive">
            Your {type === 'creator' ? 'trial has' : 'subscription has'} expired. Please renew to continue accessing the platform.
          </p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
