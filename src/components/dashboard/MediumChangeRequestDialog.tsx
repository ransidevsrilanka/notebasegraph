import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Languages, Loader2 } from 'lucide-react';

interface MediumChangeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MEDIUM_OPTIONS = [
  { value: '', label: 'No change' },
  { value: 'english', label: 'English' },
  { value: 'sinhala', label: 'Sinhala' },
];

const MediumChangeRequestDialog = ({ open, onOpenChange }: MediumChangeRequestDialogProps) => {
  const { user, enrollment, userSubjects, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject1Medium, setSubject1Medium] = useState('');
  const [subject2Medium, setSubject2Medium] = useState('');
  const [subject3Medium, setSubject3Medium] = useState('');
  const [reason, setReason] = useState('');

  const subjects = [
    { name: userSubjects?.subject_1, medium: subject1Medium, setMedium: setSubject1Medium },
    { name: userSubjects?.subject_2, medium: subject2Medium, setMedium: setSubject2Medium },
    { name: userSubjects?.subject_3, medium: subject3Medium, setMedium: setSubject3Medium },
  ].filter(s => s.name);

  const hasAnyChange = subject1Medium || subject2Medium || subject3Medium;

  const handleSubmit = async () => {
    if (!user || !enrollment || !userSubjects) return;
    if (!hasAnyChange) {
      toast.error('Please select at least one subject to change medium');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the request
      const { error } = await supabase.from('subject_medium_requests').insert({
        user_id: user.id,
        enrollment_id: enrollment.id,
        user_subjects_id: userSubjects.id,
        subject_1_new_medium: subject1Medium || null,
        subject_2_new_medium: subject2Medium || null,
        subject_3_new_medium: subject3Medium || null,
        reason: reason || null,
      });

      if (error) throw error;

      // Send Telegram notification
      const changes = subjects
        .map((s, i) => {
          const newMedium = [subject1Medium, subject2Medium, subject3Medium][i];
          return newMedium ? `${s.name}: → ${newMedium}` : null;
        })
        .filter(Boolean)
        .join('\n');

      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          type: 'medium_change_request',
          message: `A student has requested to change subject medium.`,
          data: {
            student_name: profile?.full_name || user.email,
            student_email: user.email,
            changes,
            reason: reason || 'Not specified',
          },
        },
      });

      toast.success('Request submitted! Admin will review it shortly.');
      onOpenChange(false);
      
      // Reset form
      setSubject1Medium('');
      setSubject2Medium('');
      setSubject3Medium('');
      setReason('');
    } catch (error: any) {
      console.error('Error submitting request:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userSubjects) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-brand" />
            Change Subject Medium
          </DialogTitle>
          <DialogDescription>
            Request to change the medium (language) for specific subjects. Admin approval required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {subjects.map((subject, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">{subject.name}</Label>
              <Select value={subject.medium} onValueChange={subject.setMedium}>
                <SelectTrigger>
                  <SelectValue placeholder="No change" />
                </SelectTrigger>
                <SelectContent>
                  {MEDIUM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value || 'none'} value={opt.value || 'none'}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Reason (optional)</Label>
            <Textarea
              placeholder="Why do you need to change the medium?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnyChange}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediumChangeRequestDialog;
