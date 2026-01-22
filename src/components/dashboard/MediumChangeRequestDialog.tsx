import { useState, useEffect } from 'react';
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
import { Languages, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [changeCount, setChangeCount] = useState(0);
  const [maxChanges, setMaxChanges] = useState(3);

  useEffect(() => {
    if (userSubjects) {
      setChangeCount(userSubjects.medium_change_count || 0);
      setMaxChanges(userSubjects.max_medium_changes || 3);
    }
  }, [userSubjects]);

  const subjects = [
    { name: userSubjects?.subject_1, medium: subject1Medium, setMedium: setSubject1Medium },
    { name: userSubjects?.subject_2, medium: subject2Medium, setMedium: setSubject2Medium },
    { name: userSubjects?.subject_3, medium: subject3Medium, setMedium: setSubject3Medium },
  ].filter(s => s.name);

  const hasAnyChange = subject1Medium || subject2Medium || subject3Medium;
  const remainingChanges = maxChanges - changeCount;
  const canRequestChange = remainingChanges > 0;

  const handleSubmit = async () => {
    if (!user || !enrollment || !userSubjects) return;
    if (!hasAnyChange) {
      toast.error('Please select at least one subject to change medium');
      return;
    }
    if (!canRequestChange) {
      toast.error('You have used all your medium change requests');
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
            remaining_changes: remainingChanges - 1,
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

        {/* Remaining Changes Alert */}
        <Alert variant={canRequestChange ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {canRequestChange ? (
              <>You have <strong>{remainingChanges}</strong> of {maxChanges} medium changes remaining.</>
            ) : (
              <>You have used all {maxChanges} medium change requests. Contact support for assistance.</>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-4 py-4">
          {subjects.map((subject, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-sm font-medium">{subject.name}</Label>
              <Select 
                value={subject.medium} 
                onValueChange={subject.setMedium}
                disabled={!canRequestChange}
              >
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
              disabled={!canRequestChange}
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
            disabled={isSubmitting || !hasAnyChange || !canRequestChange}
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
