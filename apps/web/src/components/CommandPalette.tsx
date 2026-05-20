import {
  Bell,
  Bot,
  Building2,
  FileCode2,
  FileText,
  KeyRound,
  LayoutDashboard,
  MessageSquareText,
  Package,
  Search,
  Server,
  Terminal,
  Users,
  GitBranch,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface CommandItem {
  id: string;
  label: string;
  category: string;
  icon: typeof LayoutDashboard;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const lower = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) ||
        cmd.category.toLowerCase().includes(lower) ||
        cmd.keywords?.some((kw) => kw.toLowerCase().includes(lower))
    );
  }, [query, commands]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          selected.action();
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex, onClose]);

  if (!open) return null;

  return (
    <div className="command-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-input-wrapper">
          <Search size={16} className="command-search-icon" />
          <input
            ref={inputRef}
            className="command-input"
            placeholder="搜索页面、资产、告警或输入命令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-kbd">esc</kbd>
        </div>
        <div className="command-results">
          {filtered.length === 0 && (
            <div className="command-empty">无匹配结果</div>
          )}
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`command-item ${idx === selectedIndex ? "active" : ""}`}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                type="button"
              >
                <div className="command-item-icon">
                  <Icon size={16} />
                </div>
                <div className="command-item-content">
                  <span className="command-item-label">{item.label}</span>
                  <span className="command-item-category">{item.category}</span>
                </div>
                {idx === selectedIndex && (
                  <kbd className="command-item-hint">↵</kbd>
                )}
              </button>
            );
          })}
        </div>
        <div className="command-footer">
          <span><kbd>↑↓</kbd> 导航</span>
          <span><kbd>↵</kbd> 选择</span>
          <span><kbd>esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  );
}

export function buildDefaultCommands(
  navigate: (page: string) => void,
  openServer?: (id: string) => void,
  servers?: Array<{ id: string; hostname: string }>
): CommandItem[] {
  const pageCommands: CommandItem[] = [
    { id: "dashboard", label: "仪表盘", category: "页面导航", icon: LayoutDashboard, action: () => navigate("dashboard"), keywords: ["dashboard", "home", "首页"] },
    { id: "chatops", label: "AI Copilot", category: "页面导航", icon: MessageSquareText, action: () => navigate("chatops"), keywords: ["ai", "chat", "copilot", "对话"] },
    { id: "alerts", label: "告警中心", category: "页面导航", icon: Bell, action: () => navigate("alerts"), keywords: ["alert", "告警", "报警"] },
    { id: "servers", label: "资源管理", category: "页面导航", icon: Server, action: () => navigate("servers"), keywords: ["server", "服务器", "资源", "主机"] },
    { id: "scripts", label: "脚本中心", category: "页面导航", icon: FileCode2, action: () => navigate("scripts"), keywords: ["script", "脚本", "自动化"] },
    { id: "commands", label: "快捷指令", category: "页面导航", icon: Terminal, action: () => navigate("commands"), keywords: ["command", "指令", "slash"] },
    { id: "packages", label: "包管理", category: "页面导航", icon: Package, action: () => navigate("packages"), keywords: ["package", "包", "部署包"] },
    { id: "files", label: "文件管理", category: "页面导航", icon: FileText, action: () => navigate("files"), keywords: ["file", "文件", "配置"] },
    { id: "tenants", label: "多租户大盘", category: "页面导航", icon: Building2, action: () => navigate("tenants"), keywords: ["tenant", "租户"] },
    { id: "approvals", label: "工单审核", category: "页面导航", icon: ShieldCheck, action: () => navigate("approvals"), keywords: ["approval", "审批", "工单"] },
    { id: "models", label: "模型管理", category: "页面导航", icon: Bot, action: () => navigate("models"), keywords: ["model", "模型", "AI", "LLM"] },
    { id: "members", label: "成员管理", category: "页面导航", icon: Users, action: () => navigate("members"), keywords: ["member", "成员", "用户"] },
    { id: "teams", label: "团队结构", category: "页面导航", icon: GitBranch, action: () => navigate("teams"), keywords: ["team", "团队", "组织"] },
    { id: "roles", label: "权限与角色", category: "页面导航", icon: KeyRound, action: () => navigate("roles"), keywords: ["role", "权限", "角色"] },
  ];

  const serverCommands: CommandItem[] = (servers ?? []).map((s) => ({
    id: `server-${s.id}`,
    label: s.hostname,
    category: "服务器",
    icon: Server,
    action: () => openServer?.(s.id),
    keywords: [s.hostname],
  }));

  return [...pageCommands, ...serverCommands];
}