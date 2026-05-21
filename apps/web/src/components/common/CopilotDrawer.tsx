import { Bot, Send, X } from "lucide-react";

interface CopilotDrawerProps {
  open: boolean;
  onClose: () => void;
  message: string;
  setMessage: (value: string) => void;
  loading: boolean;
  onSend: (msg: string) => void;
}

export function CopilotDrawer({ open, onClose, message, setMessage, loading, onSend }: CopilotDrawerProps) {
  if (!open) return null;

  return (
    <div className="copilot-drawer-overlay" onClick={onClose}>
      <div className="copilot-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title">
            <Bot size={18} />
            <span>AI 助手</span>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-content">
          <div className="quick-prompts">
            <p className="prompts-label">快捷问题</p>
            <div className="prompt-chips">
              <button onClick={() => onSend('帮我巡检所有服务器')}>巡检服务器</button>
              <button onClick={() => onSend('查看最近的告警')}>查看告警</button>
              <button onClick={() => onSend('生成今日运维报告')}>生成报告</button>
              <button onClick={() => onSend('帮我分析性能趋势')}>性能分析</button>
            </div>
          </div>
        </div>
        <div className="drawer-input">
          <input
            type="text"
            placeholder="输入你的问题..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && message.trim()) {
                onSend(message);
              }
            }}
            disabled={loading}
          />
          <button 
            className="send-button" 
            onClick={() => message.trim() && onSend(message)}
            disabled={loading || !message.trim()}
            type="button"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
