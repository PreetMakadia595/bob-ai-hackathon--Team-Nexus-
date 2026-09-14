'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles, X, Send, Bot, User, CheckCircle2,
  AlertTriangle, RefreshCw, Thermometer, ChevronDown, ChevronRight,
  Database, ShieldCheck
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  'Analyze active disruptions and corridor impacts',
  'Check cold chain shipments for temperature excursions',
  'Recommend idle fleet assets for redeployment',
  'Show recent shipments and dispatch status'
];

export default function BobAssistantDrawer({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `### 🤖 IBM Bob Operational Assistant\n\nI am connected to your live Supabase database and business logic engines via **13 Model Context Protocol (MCP) tools**.\n\nAsk me anything about active transit disruptions, corridor impact rerouting, idle fleet redeployment scoring, or IoT cold chain compliance!`,
      toolsExecuted: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedTools, setExpandedTools] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText) => {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/bob/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const data = await res.json();
      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.reply,
            toolsExecuted: data.toolsExecuted || []
          }
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ **Error communicating with IBM Bob**: ${data.error || 'Unknown error occurred'}`,
            toolsExecuted: []
          }
        ]);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Network Error**: Unable to reach backend API endpoint.`,
          toolsExecuted: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleToolExpand = (index) => {
    setExpandedTools(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 100,
      display: 'flex',
      justifyContent: 'flex-end',
      background: 'rgba(0, 0, 0, 0.45)',
      backdropFilter: 'blur(3px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '520px',
        height: '100%',
        background: 'var(--bg-surface, #ffffff)',
        color: 'var(--text-primary, #1e293b)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 25px rgba(0, 0, 0, 0.2)',
        borderLeft: '1px solid var(--border-default, #e2e8f0)',
        animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: '1px solid var(--border-default, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(14,165,233,0.04))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #0284c7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(37,99,235,0.35)',
              color: 'white'
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '800', fontSize: '16px', letterSpacing: '-0.01em' }}>IBM Bob AI</span>
                <span style={{
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  background: 'rgba(37,99,235,0.12)',
                  color: '#2563eb',
                  letterSpacing: '0.04em'
                }}>
                  MCP LOAD-BEARING
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <Database size={12} color="#10b981" />
                <span>Live Supabase & Deterministic Engines</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Suggested Prompts */}
        <div style={{
          padding: '12px 18px',
          background: 'var(--bg-subtle, #f8fafc)',
          borderBottom: '1px solid var(--border-default, #e2e8f0)',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              style={{
                fontSize: '11px',
                padding: '5px 11px',
                borderRadius: '16px',
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-default, #e2e8f0)',
                color: 'var(--text-primary, #334155)',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.15s',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#2563eb';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-default, #e2e8f0)';
                e.currentTarget.style.color = 'var(--text-primary, #334155)';
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '6px'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                maxWidth: '92%'
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <Bot size={16} />
                  </div>
                )}

                <div style={{
                  padding: '12px 16px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: m.role === 'user' ? '#2563eb' : 'var(--bg-subtle, #f8fafc)',
                  color: m.role === 'user' ? 'white' : 'var(--text-primary, #0f172a)',
                  border: m.role === 'user' ? 'none' : '1px solid var(--border-default, #e2e8f0)',
                  fontSize: '13px',
                  lineHeight: '1.55',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.content}
                  </div>

                  {/* Tool execution badge if any */}
                  {m.toolsExecuted && m.toolsExecuted.length > 0 && (
                    <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-default, #e2e8f0)', paddingTop: '10px' }}>
                      <button
                        onClick={() => toggleToolExpand(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#2563eb',
                          fontWeight: '600',
                          padding: 0
                        }}
                      >
                        <ShieldCheck size={14} color="#10b981" />
                        <span>MCP Tools Executed ({m.toolsExecuted.length})</span>
                        {expandedTools[idx] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      {expandedTools[idx] && (
                        <div style={{
                          marginTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          fontSize: '11px'
                        }}>
                          {m.toolsExecuted.map((t, tIdx) => (
                            <div
                              key={tIdx}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '6px',
                                background: 'rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.08)'
                              }}
                            >
                              <div style={{ fontWeight: '700', color: '#0f172a' }}>
                                ⚡ Tool: <code style={{ color: '#2563eb' }}>{t.tool}</code>
                              </div>
                              <div style={{ marginTop: '4px', color: '#475569', fontFamily: 'monospace', fontSize: '10px' }}>
                                Result: {typeof t.result === 'object' ? JSON.stringify(t.result).slice(0, 160) + '...' : t.result}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {m.role === 'user' && (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}>
                    <User size={16} />
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexShrink: 0
              }}>
                <Bot size={16} />
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-default, #e2e8f0)',
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <RefreshCw size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>IBM Bob executing MCP tool queries...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-default, #e2e8f0)',
          background: 'var(--bg-surface, #ffffff)'
        }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Bob about disruptions, cold chain, or redeployment..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '11px 16px',
                borderRadius: '10px',
                border: '1px solid var(--border-default, #cbd5e1)',
                background: 'var(--bg-subtle, #f8fafc)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-default, #cbd5e1)'}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: loading || !input.trim() ? '#94a3b8' : '#2563eb',
                color: 'white',
                border: 'none',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
              }}
            >
              <Send size={18} />
            </button>
          </form>
          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted, #94a3b8)',
            textAlign: 'center',
            marginTop: '8px'
          }}>
            Model Context Protocol (MCP) • Operates on live Supabase tables • Auditable & Explainable
          </div>
        </div>
      </div>
    </div>
  );
}
