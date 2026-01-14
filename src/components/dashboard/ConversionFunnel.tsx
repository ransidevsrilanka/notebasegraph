import { TrendingUp, Users, CreditCard } from 'lucide-react';

interface ConversionFunnelProps {
  totalSignups: number;
  totalPaidUsers: number;
  totalRevenue: number;
}

export const ConversionFunnel = ({ totalSignups, totalPaidUsers, totalRevenue }: ConversionFunnelProps) => {
  const conversionRate = totalSignups > 0 ? ((totalPaidUsers / totalSignups) * 100).toFixed(1) : '0';
  const avgRevenuePerUser = totalPaidUsers > 0 ? Math.round(totalRevenue / totalPaidUsers) : 0;

  const stages = [
    { 
      label: 'Total Signups', 
      value: totalSignups, 
      icon: Users,
      color: 'bg-blue-500',
      width: '100%'
    },
    { 
      label: 'Paid Users', 
      value: totalPaidUsers, 
      icon: CreditCard,
      color: 'bg-brand',
      width: `${Math.max(totalSignups > 0 ? (totalPaidUsers / totalSignups) * 100 : 0, 20)}%`
    },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-400" />
        Conversion Funnel
      </h3>
      
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative">
            <div 
              className={`${stage.color} rounded-lg p-4 transition-all duration-500`}
              style={{ width: stage.width }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <stage.icon className="w-5 h-5 text-white" />
                  <span className="text-white font-medium text-sm">{stage.label}</span>
                </div>
                <span className="text-white font-bold text-lg">{stage.value.toLocaleString()}</span>
              </div>
            </div>
            {index < stages.length - 1 && (
              <div className="flex items-center justify-center my-2">
                <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-muted-foreground/30" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
        <div className="text-center">
          <p className="text-2xl font-bold text-brand">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground">Conversion Rate</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground">Rs. {avgRevenuePerUser.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Avg Revenue/User</p>
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnel;
