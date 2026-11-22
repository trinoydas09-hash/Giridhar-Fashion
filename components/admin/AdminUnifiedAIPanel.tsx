'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  Cpu,
  Edit3,
  ExternalLink,
  FileText,
  KeyRound,
  MessageSquare,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  AIAssistantSettings,
  AIProviderConfigPublic,
  AIProviderId,
  AIUsageStats,
  KnowledgeDocument,
} from '@/types/store';

type AISubTab = 'providers' | 'knowledge' | 'settings' | 'test';

const KNOWLEDGE_CATEGORIES = [
  'Delivery Policy',
  'Return & Exchange Policy',
  'Refund Policy',
  'Membership Information',
  'Product Information',
  'Payment Information',
  'Size Guide',
  'Offers & Promotions',
  'Frequently Asked Questions',
  'General Brand Information',
];

interface ProviderDraftState {
  is_enabled: boolean;
  selected_model: string;
  custom_base_url: string;
  api_key_input: string;
}

interface TestConsoleTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  provider_used?: string;
  model_used?: string;
  used_fallback?: boolean;
  retrieved_sources?: {
    title: string;
    category: string;
    score: number;
    excerpt: string;
  }[];
  products?: { id: string; name: string; slug: string }[];
}

export function AdminUnifiedAIPanel({
  aiSettings,
  aiUsage,
  aiProviders,
  knowledgeDocuments,
  token,
  onRefresh,
  onNotice,
}: {
  aiSettings: AIAssistantSettings;
  aiUsage?: AIUsageStats;
  aiProviders: AIProviderConfigPublic[];
  knowledgeDocuments: KnowledgeDocument[];
  token: string;
  onRefresh: () => Promise<void>;
  onNotice: (type: 'ok' | 'err', text: string) => void;
}) {
  const [subTab, setSubTab] = useState<AISubTab>('providers');

  // Unified AI settings state
  const [settingsDraft, setSettingsDraft] = useState<AIAssistantSettings>(aiSettings);
  const [savingSettings, setSavingSettings] = useState(false);

  // Provider drafts keyed by provider id (never populated with saved raw keys)
  const [providerDrafts, setProviderDrafts] = useState<Record<AIProviderId, ProviderDraftState>>(
    () => {
      const map: Record<AIProviderId, ProviderDraftState> = {
        gemini: {
          is_enabled: true,
          selected_model: 'gemini-2.5-flash-lite',
          custom_base_url: '',
          api_key_input: '',
        },
        openai: {
          is_enabled: false,
          selected_model: 'gpt-4o-mini',
          custom_base_url: '',
          api_key_input: '',
        },
        custom: {
          is_enabled: false,
          selected_model: 'llama-3.3-70b-versatile',
          custom_base_url: '',
          api_key_input: '',
        },
      };
      for (const p of aiProviders) {
        map[p.provider] = {
          is_enabled: p.is_enabled,
          selected_model: p.selected_model,
          custom_base_url: p.custom_base_url || '',
          api_key_input: '',
        };
      }
      return map;
    }
  );
  const [busyProvider, setBusyProvider] = useState<AIProviderId | null>(null);

  // Knowledge Base form state
  const [kbMode, setKbMode] = useState<'file' | 'manual'>('file');
  const [kbEditingId, setKbEditingId] = useState<string | null>(null);
  const [kbTitle, setKbTitle] = useState('');
  const [kbCategory, setKbCategory] = useState<string>('Delivery Policy');
  const [kbCustomCategory, setKbCustomCategory] = useState('');
  const [kbContent, setKbContent] = useState('');
  const [kbFile, setKbFile] = useState<File | null>(null);
  const [kbEnabled, setKbEnabled] = useState(true);
  const [kbBusy, setKbBusy] = useState(false);

  // Live Admin Test Chat Console state
  const [testInput, setTestInput] = useState('');
  const [testTurns, setTestTurns] = useState<TestConsoleTurn[]>([]);
  const [testLoading, setTestLoading] = useState(false);

  const handleSaveProvider = async (providerId: AIProviderId) => {
    const draft = providerDrafts[providerId];
    setBusyProvider(providerId);
    try {
      const payload: Record<string, unknown> = {
        provider: providerId,
        is_enabled: draft.is_enabled,
        selected_model: draft.selected_model.trim(),
        custom_base_url: draft.custom_base_url.trim() || null,
      };
      if (draft.api_key_input.trim().length > 0) {
        payload.api_key = draft.api_key_input.trim();
      }

      const res = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Could not save provider settings.');
        return;
      }

      setProviderDrafts((prev) => ({
        ...prev,
        [providerId]: { ...prev[providerId], api_key_input: '' },
      }));
      onNotice('ok', `Saved ${providerId.toUpperCase()} provider settings securely on server.`);
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving provider configuration.');
    } finally {
      setBusyProvider(null);
    }
  };

  const handleTestProvider = async (providerId: AIProviderId) => {
    const draft = providerDrafts[providerId];
    setBusyProvider(providerId);
    try {
      const res = await fetch('/api/admin/ai-providers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          provider: providerId,
          model: draft.selected_model.trim(),
          custom_base_url: draft.custom_base_url.trim() || null,
          api_key: draft.api_key_input.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Provider connection test failed.');
        return;
      }

      const result = data.testResult;
      onNotice(result?.ok ? 'ok' : 'err', result?.message || 'Connection test finished.');
      await onRefresh();
    } catch {
      onNotice('err', 'Network error testing AI provider.');
    } finally {
      setBusyProvider(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/ai-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_enabled: settingsDraft.is_enabled,
          availability_status: settingsDraft.availability_status,
          assistant_name: settingsDraft.assistant_name,
          welcome_message: settingsDraft.welcome_message,
          whatsapp_support_number: settingsDraft.whatsapp_support_number,
          active_provider: settingsDraft.active_provider,
          fallback_provider: settingsDraft.fallback_provider,
          system_instructions: settingsDraft.system_instructions,
          rag_enabled: settingsDraft.rag_enabled,
          faqs: settingsDraft.faqs.filter((f) => f.question.trim() && f.answer.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice('err', data.error || 'Failed to save AI assistant settings.');
        return;
      }
      setSettingsDraft(data.ai_settings);
      onNotice('ok', 'AI routing, system instructions, and approved FAQs updated.');
      await onRefresh();
    } catch {
      onNotice('err', 'Network error saving AI settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const resetKbForm = () => {
    setKbEditingId(null);
    setKbTitle('');
    setKbCategory('Delivery Policy');
    setKbCustomCategory('');
    setKbContent('');
    setKbFile(null);
    setKbEnabled(true);
  };

  const handleSaveKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedCategory =
      kbCategory === '__custom__'
        ? kbCustomCategory.trim() || 'General Brand Information'
        : kbCategory;

    setKbBusy(true);
    try {
      if (kbMode === 'file' && !kbEditingId) {
        if (!kbFile) {
          onNotice('err', 'Please select a PDF, DOCX, or TXT file to upload.');
          setKbBusy(false);
          return;
        }
        const fd = new FormData();
        fd.append('file', kbFile);
        if (kbTitle.trim()) fd.append('title', kbTitle.trim());
        fd.append('category', resolvedCategory);
        fd.append('is_enabled', String(kbEnabled));

        const res = await fetch('/api/admin/knowledge', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) {
          onNotice('err', data.error || 'Failed to process uploaded document.');
          return;
        }
        onNotice(
          'ok',
          `Indexed "${data.document.title}" (${data.document.chunk_count} knowledge chunks).`
        );
        resetKbForm();
        await onRefresh();
      } else {
        const res = await fetch('/api/admin/knowledge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: kbEditingId || undefined,
            title: kbTitle.trim(),
            category: resolvedCategory,
            content: kbContent.trim(),
            is_enabled: kbEnabled,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          onNotice('err', data.error || 'Failed to save knowledge entry.');
          return;
        }
        onNotice(
          'ok',
          `${kbEditingId ? 'Updated' : 'Indexed'} "${data.document.title}" (${data.document.chunk_count} chunks).`
        );
        resetKbForm();
        await onRefresh();
      }
    } catch {
      onNotice('err', 'Network error saving knowledge document.');
    } finally {
      setKbBusy(false);
    }
  };

  const handleToggleKnowledge = async (doc: KnowledgeDocument) => {
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: doc.id, is_enabled: !doc.is_enabled }),
      });
      if (!res.ok) {
        onNotice('err', 'Failed to toggle knowledge document.');
        return;
      }
      onNotice(
        'ok',
        `"${doc.title}" ${!doc.is_enabled ? 'enabled' : 'disabled'} for AI retrieval.`
      );
      await onRefresh();
    } catch {
      onNotice('err', 'Network error updating document.');
    }
  };

  const handleDeleteKnowledge = async (doc: KnowledgeDocument) => {
    try {
      const res = await fetch(`/api/admin/knowledge?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        onNotice('err', 'Failed to delete document.');
        return;
      }
      if (kbEditingId === doc.id) resetKbForm();
      onNotice('ok', `Deleted knowledge document: ${doc.title}`);
      await onRefresh();
    } catch {
      onNotice('err', 'Network error deleting document.');
    }
  };

  const handleRunTestPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = testInput.trim();
    if (!prompt || testLoading) return;

    const history = testTurns.slice(-8).map((t) => ({
      role: (t.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: t.text,
    }));

    const userTurn: TestConsoleTurn = {
      id: `tu-${Date.now()}`,
      role: 'user',
      text: prompt,
    };
    setTestTurns((prev) => [...prev, userTurn]);
    setTestInput('');
    setTestLoading(true);

    try {
      const res = await fetch('/api/admin/ai-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: prompt, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestTurns((prev) => [
          ...prev,
          {
            id: `te-${Date.now()}`,
            role: 'assistant',
            text: `Error: ${data.error || 'Unable to generate test reply.'}`,
          },
        ]);
        return;
      }

      setTestTurns((prev) => [
        ...prev,
        {
          id: `ta-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          provider_used: data.provider_used,
          model_used: data.model_used,
          used_fallback: data.used_fallback,
          retrieved_sources: data.retrieved_sources || [],
          products: data.products || [],
        },
      ]);
    } catch {
      setTestTurns((prev) => [
        ...prev,
        {
          id: `te-${Date.now()}`,
          role: 'assistant',
          text: 'Network error communicating with AI test console.',
        },
      ]);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Usage Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4DDD0] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#5A5853]">
            Conversations
          </p>
          <p className="font-serif text-3xl font-semibold text-[#173D32] mt-1.5 tabular-nums">
            {aiUsage?.total_conversations ?? 0}
          </p>
        </div>
        <div className="bg-white border border-[#E4DDD0] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#5A5853]">
            Total Messages
          </p>
          <p className="font-serif text-3xl font-semibold text-[#173D32] mt-1.5 tabular-nums">
            {aiUsage?.total_messages ?? 0}
          </p>
        </div>
        <div className="bg-white border border-[#E4DDD0] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#5A5853]">
            Active Engine
          </p>
          <p className="text-sm font-semibold text-[#242424] mt-2 uppercase">
            {settingsDraft.active_provider}
            {settingsDraft.fallback_provider ? ` -> ${settingsDraft.fallback_provider}` : ''}
          </p>
        </div>
        <div className="bg-white border border-[#E4DDD0] p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-[#5A5853]">
            Knowledge Docs
          </p>
          <p className="font-serif text-3xl font-semibold text-[#173D32] mt-1.5 tabular-nums">
            {knowledgeDocuments.filter((d) => d.is_enabled).length}
            <span className="text-sm font-sans font-normal text-[#7A756D]">
              /{knowledgeDocuments.length}
            </span>
          </p>
        </div>
      </div>

      {/* Unified AI Panel Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F5F0E7] border border-[#E4DDD0]">
        {[
          { key: 'providers' as AISubTab, label: 'Providers & Models', icon: Cpu },
          { key: 'knowledge' as AISubTab, label: 'Knowledge Base (RAG)', icon: BookOpen },
          { key: 'settings' as AISubTab, label: 'Settings & FAQs', icon: Bot },
          { key: 'test' as AISubTab, label: 'Live Test Console', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setSubTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#173D32] text-[#FAF9F6]'
                  : 'text-[#5A5853] hover:text-[#242424]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: PROVIDERS & MODELS */}
      {subTab === 'providers' && (
        <div className="space-y-6">
          <div className="bg-[#F5F0E7] border border-[#E4DDD0] p-4 flex items-start gap-3 text-xs text-[#242424]">
            <ShieldCheck className="w-4 h-4 text-[#173D32] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              API credentials are encrypted server-side with AES-256-GCM (or read from server
              environment variables) and are never returned to or exposed in browser code. After
              saving, only a masked preview is shown.
            </p>
          </div>

          <div className="space-y-4">
            {aiProviders.map((provider) => {
              const draft = providerDrafts[provider.provider];
              const isBusy = busyProvider === provider.provider;

              return (
                <div
                  key={provider.provider}
                  className="bg-white border border-[#E4DDD0] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DDD0] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-xl font-semibold text-[#242424]">
                          {provider.label}
                        </h3>
                        {settingsDraft.active_provider === provider.provider && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#173D32]">
                            · Primary Active
                          </span>
                        )}
                        {settingsDraft.fallback_provider === provider.provider && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B99A61]">
                            · Fallback
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A5853] mt-0.5 flex items-center gap-2">
                        <span>
                          {provider.has_api_key
                            ? `Configured (${provider.key_preview || 'Server Key Active'})`
                            : 'No API key configured yet'}
                        </span>
                        {provider.last_test_status === 'ok' && (
                          <span className="inline-flex items-center gap-1 text-[#065F46]">
                            · <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                        {provider.last_test_status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-[#991B1B]">
                            · <XCircle className="w-3.5 h-3.5" /> {provider.last_test_message}
                          </span>
                        )}
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#FAF9F6] border border-[#E4DDD0] text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.is_enabled}
                        onChange={(e) =>
                          setProviderDrafts((prev) => ({
                            ...prev,
                            [provider.provider]: {
                              ...prev[provider.provider],
                              is_enabled: e.target.checked,
                            },
                          }))
                        }
                      />
                      <span>{draft.is_enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">
                        API Key (Encrypted Server-Side)
                      </label>
                      <div className="relative">
                        <KeyRound className="w-3.5 h-3.5 text-[#7A756D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          autoComplete="new-password"
                          value={draft.api_key_input}
                          onChange={(e) =>
                            setProviderDrafts((prev) => ({
                              ...prev,
                              [provider.provider]: {
                                ...prev[provider.provider],
                                api_key_input: e.target.value,
                              },
                            }))
                          }
                          placeholder={
                            provider.has_api_key
                              ? 'Enter new key to replace saved key'
                              : 'Paste provider API key...'
                          }
                          className="w-full border border-[#D8CFC0] pl-8 pr-3 py-2 text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase mb-1">
                        Model Selection
                      </label>
                      <select
                        value={
                          provider.available_models.includes(draft.selected_model)
                            ? draft.selected_model
                            : '__custom__'
                        }
                        onChange={(e) => {
                          if (e.target.value !== '__custom__') {
                            setProviderDrafts((prev) => ({
                              ...prev,
                              [provider.provider]: {
                                ...prev[provider.provider],
                                selected_model: e.target.value,
                              },
                            }));
                          }
                        }}
                        className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
                      >
                        {provider.available_models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">Custom Model ID...</option>
                      </select>
                      {(!provider.available_models.includes(draft.selected_model) ||
                        provider.provider === 'custom') && (
                        <input
                          type="text"
                          value={draft.selected_model}
                          onChange={(e) =>
                            setProviderDrafts((prev) => ({
                              ...prev,
                              [provider.provider]: {
                                ...prev[provider.provider],
                                selected_model: e.target.value,
                              },
                            }))
                          }
                          placeholder="Custom model identifier"
                          className="w-full border border-[#D8CFC0] px-3 py-1.5 text-xs font-mono mt-2"
                        />
                      )}
                    </div>

                    {provider.provider === 'custom' && (
                      <div>
                        <label className="block text-xs font-semibold uppercase mb-1">
                          OpenAI-Compatible Base URL
                        </label>
                        <input
                          type="url"
                          value={draft.custom_base_url}
                          onChange={(e) =>
                            setProviderDrafts((prev) => ({
                              ...prev,
                              [provider.provider]: {
                                ...prev[provider.provider],
                                custom_base_url: e.target.value,
                              },
                            }))
                          }
                          placeholder="https://api.groq.com/openai/v1"
                          className="w-full border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSaveProvider(provider.provider)}
                      className="px-5 py-2 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
                    >
                      {isBusy ? 'Processing...' : 'Save Provider'}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTestProvider(provider.provider)}
                      className="px-5 py-2 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase tracking-wider hover:bg-[#F5F0E7] disabled:opacity-60"
                    >
                      Test Connection
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE & RAG */}
      {subTab === 'knowledge' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveKnowledge}
            className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DDD0] pb-4">
              <div>
                <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                  {kbEditingId ? 'Edit Knowledge Document' : 'Add Brand Knowledge (RAG)'}
                </h3>
                <p className="text-xs text-[#5A5853] mt-0.5">
                  Upload PDF, DOCX, or TXT files, or enter structured policies. Content is chunked,
                  embedded, and retrieved automatically for grounded AI responses.
                </p>
              </div>
              {!kbEditingId && (
                <div className="flex items-center gap-1 p-1 bg-[#F5F0E7] border border-[#E4DDD0]">
                  <button
                    type="button"
                    onClick={() => setKbMode('file')}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      kbMode === 'file' ? 'bg-[#173D32] text-white' : 'text-[#5A5853]'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => setKbMode('manual')}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      kbMode === 'manual' ? 'bg-[#173D32] text-white' : 'text-[#5A5853]'
                    }`}
                  >
                    Manual Text
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Document Title {kbMode === 'file' && !kbEditingId ? '(Optional)' : '*'}
                </label>
                <input
                  type="text"
                  required={kbMode === 'manual' || Boolean(kbEditingId)}
                  value={kbTitle}
                  onChange={(e) => setKbTitle(e.target.value)}
                  placeholder="e.g. Dhaka & Nationwide Delivery Policy"
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase mb-1">Category *</label>
                <select
                  value={kbCategory}
                  onChange={(e) => setKbCategory(e.target.value)}
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
                >
                  {KNOWLEDGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="__custom__">Custom Category...</option>
                </select>
                {kbCategory === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={kbCustomCategory}
                    onChange={(e) => setKbCustomCategory(e.target.value)}
                    placeholder="Enter custom category name"
                    className="w-full border border-[#D8CFC0] px-3 py-1.5 text-xs mt-2"
                  />
                )}
              </div>
            </div>

            {kbMode === 'file' && !kbEditingId ? (
              <div className="border border-dashed border-[#B99A61] bg-[#FAF9F6] p-6 text-center space-y-3">
                <Upload className="w-6 h-6 text-[#173D32] mx-auto" />
                <div>
                  <p className="text-sm font-medium text-[#242424]">
                    {kbFile ? kbFile.name : 'Select a PDF, DOCX, or TXT document (max 10 MB)'}
                  </p>
                  <p className="text-xs text-[#7A756D] mt-0.5">
                    Text will be extracted, split into overlapping chunks, and indexed immediately.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 px-5 py-2 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase cursor-pointer hover:bg-[#173D32] hover:text-white transition-colors">
                  <span>{kbFile ? 'Choose Another File' : 'Choose Document File'}</span>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    className="hidden"
                    onChange={(e) => setKbFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold uppercase mb-1">
                  Document Text Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={kbContent}
                  onChange={(e) => setKbContent(e.target.value)}
                  placeholder="Write detailed policy, sizing chart, fabric care, or brand information..."
                  className="w-full border border-[#D8CFC0] px-3 py-2 text-sm leading-relaxed"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={kbEnabled}
                  onChange={(e) => setKbEnabled(e.target.checked)}
                />
                <span>Enable for AI retrieval immediately</span>
              </label>

              <div className="flex items-center gap-3">
                {kbEditingId && (
                  <button
                    type="button"
                    onClick={resetKbForm}
                    className="px-4 py-2 border border-[#D8CFC0] text-xs font-semibold"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="submit"
                  disabled={kbBusy}
                  className="px-6 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
                >
                  {kbBusy
                    ? 'Indexing...'
                    : kbEditingId
                    ? 'Update Knowledge Entry'
                    : 'Index Knowledge Document'}
                </button>
              </div>
            </div>
          </form>

          {/* Knowledge Base Documents List */}
          <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-4">
            <h3 className="font-serif text-xl font-semibold text-[#242424]">
              Indexed Knowledge Documents ({knowledgeDocuments.length})
            </h3>

            {knowledgeDocuments.length === 0 ? (
              <p className="text-sm text-[#5A5853] py-4">
                No knowledge documents indexed yet. Upload policies or manuals above.
              </p>
            ) : (
              <div className="divide-y divide-[#E4DDD0]">
                {knowledgeDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 font-semibold text-[#173D32]">
                          <FileText className="w-3.5 h-3.5" />
                          {doc.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase text-[#7A756D]">{doc.source_type}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums text-[#5A5853]">
                          {doc.chunk_count} chunk(s)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={doc.is_enabled ? 'text-[#065F46]' : 'text-[#991B1B]'}>
                          {doc.is_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="font-serif text-lg font-semibold text-[#242424] truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-[#5A5853] line-clamp-2">{doc.content}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleKnowledge(doc)}
                        className="px-3 py-1.5 border border-[#D8CFC0] text-xs font-medium hover:bg-[#FAF9F6]"
                      >
                        {doc.is_enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setKbEditingId(doc.id);
                          setKbMode('manual');
                          setKbTitle(doc.title);
                          if (KNOWLEDGE_CATEGORIES.includes(doc.category)) {
                            setKbCategory(doc.category);
                            setKbCustomCategory('');
                          } else {
                            setKbCategory('__custom__');
                            setKbCustomCategory(doc.category);
                          }
                          setKbContent(doc.content);
                          setKbEnabled(doc.is_enabled);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-medium"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteKnowledge(doc)}
                        aria-label={`Delete ${doc.title}`}
                        className="p-1.5 text-[#991B1B] border border-[#FECACA] hover:bg-[#FEF2F2]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: UNIFIED ASSISTANT SETTINGS, ROUTING & FAQS */}
      {subTab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DDD0] pb-4">
            <div>
              <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                Assistant Controls, Routing &amp; System Instructions
              </h3>
              <p className="text-xs text-[#5A5853] mt-0.5">
                Configure primary &amp; fallback AI providers, RAG grounding, system prompt, and
                verified store FAQs.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F5F0E7] border border-[#E4DDD0] text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.rag_enabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, rag_enabled: e.target.checked })
                  }
                />
                <span>RAG Grounding</span>
              </label>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#F5F0E7] border border-[#E4DDD0] text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsDraft.is_enabled}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, is_enabled: e.target.checked })
                  }
                />
                <span>{settingsDraft.is_enabled ? 'Chatbot Enabled' : 'Disabled'}</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Default Active AI Provider
              </label>
              <select
                value={settingsDraft.active_provider}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    active_provider: e.target.value as AIProviderId,
                  })
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="custom">Other / OpenAI-Compatible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Fallback Provider (If Primary Fails)
              </label>
              <select
                value={settingsDraft.fallback_provider || ''}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    fallback_provider: (e.target.value || null) as AIProviderId | null,
                  })
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
              >
                <option value="">No Automatic Fallback</option>
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="custom">Other / OpenAI-Compatible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                Availability Status
              </label>
              <select
                value={settingsDraft.availability_status}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    availability_status: e.target.value as 'online' | 'away' | 'offline',
                  })
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm bg-white"
              >
                <option value="online">Online</option>
                <option value="away">Limited Availability (Away)</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">Assistant Name *</label>
              <input
                type="text"
                required
                value={settingsDraft.assistant_name}
                onChange={(e) =>
                  setSettingsDraft({ ...settingsDraft, assistant_name: e.target.value })
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase mb-1">
                WhatsApp Support Number *
              </label>
              <input
                type="text"
                required
                value={settingsDraft.whatsapp_support_number}
                onChange={(e) =>
                  setSettingsDraft({
                    ...settingsDraft,
                    whatsapp_support_number: e.target.value,
                  })
                }
                className="w-full border border-[#D8CFC0] px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">Welcome Message *</label>
            <textarea
              rows={2}
              required
              value={settingsDraft.welcome_message}
              onChange={(e) =>
                setSettingsDraft({ ...settingsDraft, welcome_message: e.target.value })
              }
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase mb-1">
              AI System Instructions *
            </label>
            <textarea
              rows={4}
              required
              value={settingsDraft.system_instructions}
              onChange={(e) =>
                setSettingsDraft({ ...settingsDraft, system_instructions: e.target.value })
              }
              className="w-full border border-[#D8CFC0] px-3 py-2 text-sm leading-relaxed"
            />
          </div>

          {/* Approved FAQs */}
          <div className="space-y-3 border-t border-[#E4DDD0] pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-lg font-semibold text-[#242424]">
                  Approved Quick FAQs
                </h4>
                <p className="text-xs text-[#5A5853]">
                  Quick structured answers combined alongside RAG knowledge documents, live offers,
                  and membership details.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettingsDraft({
                    ...settingsDraft,
                    faqs: [
                      ...settingsDraft.faqs,
                      {
                        id: `faq-${Date.now()}`,
                        category: 'General',
                        question: '',
                        answer: '',
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#173D32] text-[#173D32] text-xs font-semibold uppercase"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            </div>

            <div className="space-y-3">
              {settingsDraft.faqs.map((faq, idx) => (
                <div key={faq.id} className="p-4 bg-[#FAF9F6] border border-[#E4DDD0] space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={faq.category}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          faqs: settingsDraft.faqs.map((item, i) =>
                            i === idx ? { ...item, category: e.target.value } : item
                          ),
                        })
                      }
                      placeholder="Category"
                      className="w-36 bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          faqs: settingsDraft.faqs.map((item, i) =>
                            i === idx ? { ...item, question: e.target.value } : item
                          ),
                        })
                      }
                      placeholder="Question"
                      className="flex-1 bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsDraft({
                          ...settingsDraft,
                          faqs: settingsDraft.faqs.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1.5 text-[#991B1B] hover:bg-[#FEF2F2]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={faq.answer}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        faqs: settingsDraft.faqs.map((item, i) =>
                          i === idx ? { ...item, answer: e.target.value } : item
                        ),
                      })
                    }
                    placeholder="Verified store answer..."
                    className="w-full bg-white border border-[#D8CFC0] px-2.5 py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="px-7 py-3 bg-[#173D32] text-[#FAF9F6] text-xs font-bold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
          >
            {savingSettings ? 'Saving...' : 'Save AI Settings'}
          </button>
        </form>
      )}

      {/* TAB 4: LIVE ADMIN TEST CONSOLE */}
      {subTab === 'test' && (
        <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DDD0] pb-4">
            <div>
              <h3 className="font-serif text-2xl font-semibold text-[#242424]">
                Live AI Test Console
              </h3>
              <p className="text-xs text-[#5A5853] mt-0.5">
                Test active provider routing, fallback behavior, offers awareness, membership rules,
                and retrieved RAG Knowledge Base sources before customers interact.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTestTurns([])}
              className="px-3.5 py-1.5 border border-[#D8CFC0] text-xs font-semibold"
            >
              Clear Console
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'What active bundle offers do you have right now?',
              'Tell me about GIRIDHAR PREMIUM MEMBERSHIP price and benefits.',
              'What is your Dhaka delivery charge and 7-day exchange policy?',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTestInput(sample)}
                className="px-3 py-1.5 bg-[#FAF9F6] border border-[#E4DDD0] text-xs text-[#173D32] hover:bg-[#F5F0E7]"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="border border-[#E4DDD0] bg-[#FAF9F6] p-4 min-h-[260px] max-h-[420px] overflow-y-auto space-y-4">
            {testTurns.length === 0 ? (
              <p className="text-xs text-[#7A756D] py-12 text-center">
                Send a prompt below to inspect live AI grounding, provider selection, and RAG
                document matches.
              </p>
            ) : (
              testTurns.map((turn) => (
                <div
                  key={turn.id}
                  className={`p-4 border text-sm space-y-2 ${
                    turn.role === 'user'
                      ? 'bg-[#173D32] text-[#FAF9F6] border-[#173D32] ml-10'
                      : 'bg-white text-[#242424] border-[#E4DDD0] mr-10'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{turn.text}</p>

                  {turn.provider_used && (
                    <div className="pt-2 border-t border-[#E4DDD0] text-[11px] text-[#5A5853] flex flex-wrap gap-3">
                      <span className="font-mono font-semibold text-[#173D32]">
                        Engine: {turn.provider_used} ({turn.model_used})
                      </span>
                      {turn.used_fallback && (
                        <span className="text-[#991B1B] font-medium">
                          · Fallback activated
                        </span>
                      )}
                    </div>
                  )}

                  {turn.products && turn.products.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {turn.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          target="_blank"
                          className="text-xs text-[#173D32] underline"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  {turn.retrieved_sources && turn.retrieved_sources.length > 0 && (
                    <div className="pt-2 border-t border-[#E4DDD0] space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase text-[#5A5853]">
                        Retrieved RAG Sources ({turn.retrieved_sources.length})
                      </p>
                      {turn.retrieved_sources.map((src, i) => (
                        <div
                          key={`${src.title}-${i}`}
                          className="p-2 bg-[#FAF9F6] border border-[#E4DDD0] text-[11px]"
                        >
                          <p className="font-semibold text-[#173D32] tabular-nums">
                            {src.title} · {src.category} · Score {(src.score * 100).toFixed(0)}%
                          </p>
                          <p className="text-[#5A5853] mt-0.5 line-clamp-2">{src.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleRunTestPrompt} className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Ask GIRIDHAR AI a test question (English or Bangla)..."
              className="flex-1 border border-[#D8CFC0] px-3.5 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={testLoading || !testInput.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#173D32] text-[#FAF9F6] text-xs font-semibold uppercase tracking-wider hover:bg-[#102B23] disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testLoading ? 'Running...' : 'Test Prompt'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Recent Customer Queries */}
      {aiUsage && aiUsage.recent_queries && aiUsage.recent_queries.length > 0 && (
        <div className="bg-white border border-[#E4DDD0] p-6">
          <h3 className="font-serif text-xl font-semibold text-[#242424] mb-3">
            Recent Customer Queries
          </h3>
          <ul className="divide-y divide-[#E4DDD0] text-xs">
            {aiUsage.recent_queries.map((q, idx) => (
              <li key={`${q.created_at}-${idx}`} className="py-2.5 flex items-center justify-between gap-4">
                <span className="text-[#242424] truncate">{q.query}</span>
                <span className="text-[#5A5853] uppercase shrink-0 tabular-nums">
                  {q.language} · {q.created_at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Read-Only Assistant Data Endpoints */}
      <div className="bg-white border border-[#E4DDD0] p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#242424]">
            Read-Only Assistant Data Endpoints
          </h2>
          <p className="text-sm text-[#5A5853] mt-1 leading-relaxed">
            Structured JSON endpoints for catalog, availability, active offers, membership, and store
            configuration.
          </p>
        </div>

        <div className="divide-y divide-[#E4DDD0] border-y border-[#E4DDD0] text-xs">
          {[
            {
              method: 'GET',
              path: '/api/v1/assistant/products?q=sweater&colour=Burgundy&size=M',
              desc: 'Search published products with category, colour, size, and maxPrice filters.',
            },
            {
              method: 'GET',
              path: '/api/v1/assistant/products/heritage-cable-knit-sweater/availability',
              desc: 'Retrieve real-time variant SKUs, stock quantities, and pricing for a piece.',
            },
            {
              method: 'GET',
              path: '/api/v1/assistant/categories',
              desc: 'Retrieve published storefront categories and navigation slugs.',
            },
            {
              method: 'GET',
              path: '/api/v1/assistant/store',
              desc: 'Retrieve delivery charges, currency, WhatsApp format, active offers, and membership details.',
            },
          ].map((ep) => (
            <div
              key={ep.path}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <p className="font-mono font-semibold text-[#173D32]">
                  {ep.method} {ep.path}
                </p>
                <p className="text-[#5A5853] mt-0.5">{ep.desc}</p>
              </div>
              <a
                href={ep.path}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#173D32] hover:underline shrink-0"
              >
                <span>Inspect JSON</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
