import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ChatMessage, GamePlayer } from '@/lib/gameUtils';
import { MessageCircle, Send } from 'lucide-react';

interface GameChatProps {
  roomId: string;
  playerId: string;
  players: GamePlayer[];
}

export const GameChat = ({ roomId, playerId, players }: GameChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastReadTime = useRef<Date>(new Date());

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev, newMsg]);
          
          // Increment unread if chat is closed and message is not from current player
          if (!isOpen && newMsg.player_id !== playerId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playerId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastReadTime.current = new Date();
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('game_chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || loading) return;

    setLoading(true);
    try {
      await supabase.from('game_chat_messages').insert({
        room_id: roomId,
        player_id: playerId,
        message: newMessage.trim(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Jogador';
  const currentPlayer = players.find(p => p.id === playerId);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative bg-background/80 backdrop-blur-sm"
        >
          <MessageCircle className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Chat da Partida
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm">
                Nenhuma mensagem ainda. Comece a conversar!
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.player_id === playerId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-xs text-muted-foreground mb-1">
                      {isMe ? 'Você' : getPlayerName(msg.player_id)}
                    </span>
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[85%] ${
                        isMe 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              maxLength={500}
            />
            <Button onClick={handleSend} disabled={loading || !newMessage.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
