-- AI chat credits tracking per month
CREATE TABLE public.ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  credits_used INTEGER DEFAULT 0,
  credits_limit INTEGER NOT NULL, -- 30000 for Gold, 100000 for Platinum
  strikes INTEGER DEFAULT 0,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- AI chat message history
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  word_count INTEGER, -- For user messages, tracks credit usage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_credits
CREATE POLICY "Users can read own credits" ON public.ai_credits 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credits" ON public.ai_credits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credits" ON public.ai_credits 
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for ai_chat_messages
CREATE POLICY "Users can read own messages" ON public.ai_chat_messages 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON public.ai_chat_messages 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_ai_credits_user_month ON public.ai_credits(user_id, month_year);
CREATE INDEX idx_ai_chat_messages_user ON public.ai_chat_messages(user_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_ai_credits_updated_at
  BEFORE UPDATE ON public.ai_credits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();