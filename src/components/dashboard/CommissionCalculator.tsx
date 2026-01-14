import { useState } from 'react';
import { Calculator, TrendingUp, Award, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CommissionCalculatorProps {
  currentCommissionRate: number; // e.g., 8 for 8%
  bonusRate: number; // e.g., 13 for 13%
  annualPaidUsers: number;
  bonusThreshold: number; // e.g., 10000
  avgOrderValue?: number;
}

export const CommissionCalculator = ({
  currentCommissionRate,
  bonusRate,
  annualPaidUsers,
  bonusThreshold,
  avgOrderValue = 3000,
}: CommissionCalculatorProps) => {
  const [simulatedUsers, setSimulatedUsers] = useState<string>('100');
  const [customOrderValue, setCustomOrderValue] = useState<string>(avgOrderValue.toString());

  const usersToSimulate = parseInt(simulatedUsers) || 0;
  const orderValue = parseInt(customOrderValue) || avgOrderValue;

  // Calculate estimated commissions
  const totalRevenue = usersToSimulate * orderValue;
  const currentEarnings = Math.round(totalRevenue * (currentCommissionRate / 100));
  const bonusEarnings = Math.round(totalRevenue * (bonusRate / 100));
  const bonusDifference = bonusEarnings - currentEarnings;

  // Progress to bonus
  const usersToBonus = Math.max(0, bonusThreshold - annualPaidUsers);
  const bonusProgress = Math.min((annualPaidUsers / bonusThreshold) * 100, 100);
  const bonusUnlocked = annualPaidUsers >= bonusThreshold;

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calculator className="w-5 h-5 text-brand" />
        Commission Calculator
      </h3>

      {/* Simulator Inputs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label className="text-xs text-muted-foreground">Paid Users</Label>
          <Input
            type="number"
            value={simulatedUsers}
            onChange={(e) => setSimulatedUsers(e.target.value)}
            className="mt-1"
            min="0"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Avg Order (LKR)</Label>
          <Input
            type="number"
            value={customOrderValue}
            onChange={(e) => setCustomOrderValue(e.target.value)}
            className="mt-1"
            min="0"
          />
        </div>
      </div>

      {/* Earnings Preview */}
      <div className="space-y-3 mb-6">
        <div className="p-4 rounded-xl bg-brand/10 border border-brand/30">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-brand" />
              Current Rate ({currentCommissionRate}%)
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">LKR {currentEarnings.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            From LKR {totalRevenue.toLocaleString()} revenue
          </p>
        </div>

        <div className={`p-4 rounded-xl ${bonusUnlocked ? 'bg-green-500/10 border-green-500/30' : 'bg-muted/30 border-border'} border`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Award className={`w-4 h-4 ${bonusUnlocked ? 'text-green-500' : 'text-muted-foreground'}`} />
              Bonus Rate ({bonusRate}%)
              {bonusUnlocked && <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">UNLOCKED</span>}
            </span>
          </div>
          <p className={`text-2xl font-bold ${bonusUnlocked ? 'text-green-500' : 'text-muted-foreground'}`}>
            LKR {bonusEarnings.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            +LKR {bonusDifference.toLocaleString()} extra with bonus rate
          </p>
        </div>
      </div>

      {/* Bonus Progress */}
      {!bonusUnlocked && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand" />
              Bonus Progress
            </span>
            <span className="text-xs text-muted-foreground">
              {annualPaidUsers.toLocaleString()} / {bonusThreshold.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 mb-2">
            <div 
              className="bg-brand h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${bonusProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {usersToBonus.toLocaleString()} more paid users to unlock +{bonusRate - currentCommissionRate}% bonus
          </p>
        </div>
      )}

      {bonusUnlocked && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <p className="text-xs text-green-500 flex items-center gap-2">
            <Award className="w-4 h-4" />
            🎉 Congratulations! You've unlocked the {bonusRate}% commission rate!
          </p>
        </div>
      )}
    </div>
  );
};

export default CommissionCalculator;
