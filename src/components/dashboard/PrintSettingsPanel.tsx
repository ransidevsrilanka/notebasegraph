import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Save } from 'lucide-react';
import { toast } from 'sonner';

interface PrintSettings {
  id: string;
  notes_price_per_page: number;
  model_paper_price_per_page: number;
  base_delivery_fee: number;
  cod_extra_fee: number;
}

const PrintSettingsPanel = () => {
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [notesPrice, setNotesPrice] = useState(5);
  const [modelPaperPrice, setModelPaperPrice] = useState(8);
  const [deliveryFee, setDeliveryFee] = useState(200);
  const [codFee, setCodFee] = useState(50);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('print_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setSettings(data);
      setNotesPrice(data.notes_price_per_page);
      setModelPaperPrice(data.model_paper_price_per_page);
      setDeliveryFee(data.base_delivery_fee);
      setCodFee(data.cod_extra_fee);
    }
    setIsLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('print_settings')
      .update({
        notes_price_per_page: notesPrice,
        model_paper_price_per_page: modelPaperPrice,
        base_delivery_fee: deliveryFee,
        cod_extra_fee: codFee,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id);

    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Print pricing updated');
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
        <Printer className="w-5 h-5 text-brand" />
        Print Request Pricing
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="notesPrice">Notes Price (per page)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
            <Input
              id="notesPrice"
              type="number"
              value={notesPrice}
              onChange={(e) => setNotesPrice(parseFloat(e.target.value) || 0)}
              className="pl-10"
              min={0}
              step={0.5}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="modelPaperPrice">Model Paper Price (per page)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
            <Input
              id="modelPaperPrice"
              type="number"
              value={modelPaperPrice}
              onChange={(e) => setModelPaperPrice(parseFloat(e.target.value) || 0)}
              className="pl-10"
              min={0}
              step={0.5}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="deliveryFee">Base Delivery Fee</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
            <Input
              id="deliveryFee"
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
              className="pl-10"
              min={0}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="codFee">COD Extra Fee</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
            <Input
              id="codFee"
              type="number"
              value={codFee}
              onChange={(e) => setCodFee(parseFloat(e.target.value) || 0)}
              className="pl-10"
              min={0}
            />
          </div>
        </div>
      </div>

      <Button onClick={saveSettings} disabled={isSaving} className="mt-4 w-full">
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? 'Saving...' : 'Save Pricing'}
      </Button>
    </div>
  );
};

export default PrintSettingsPanel;
