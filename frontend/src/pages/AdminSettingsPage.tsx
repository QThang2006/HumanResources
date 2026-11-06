import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Database,
  GraduationCap,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { systemConfigApi } from '../api/system-config.api';
import { KnowledgeBasePanel } from '../components/KnowledgeBasePanel';
import { TrainingPanel } from '../components/TrainingPanel';
import { useAuth } from '../context/AuthContext';
import { UserManagementPanel } from '../components/UserManagementPanel';
import '../styles/tv4-ui.css';
import './tv4-workspace.css';

type AdminTab = 'rbac' | 'api' | 'rag' | 'courses';

const NAV_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'rbac', label: 'Người dùng & Phân quyền', icon: ShieldCheck },
  { id: 'api', label: 'Tích hợp', icon: Workflow },
  { id: 'rag', label: 'Kho tri thức', icon: Database },
  { id: 'courses', label: 'Đào tạo & Phát triển', icon: GraduationCap },
];

const ConnectionStatus: React.FC<{
  success: boolean | null;
  text: string;
}> = ({ success, text }) => {
  if (!text) return null;

  return (
    <div
      className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        success === true
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : success === false
            ? 'border-rose-200 bg-rose-50 text-rose-700'
            : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {success === true ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : success === false ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      )}
      <span>{text}</span>
    </div>
  );
};

const IntegrationsPanel: React.FC<{
  geminiApiKey: string;
  n8nWebhookUrl: string;
  configSaving: boolean;
  configMessage: string;
  geminiTesting: boolean;
  geminiTestMessage: string;
  geminiTestSuccess: boolean | null;
  n8nTesting: boolean;
  n8nTestMessage: string;
  n8nTestSuccess: boolean | null;
  onGeminiKeyChange: (value: string) => void;
  onN8nUrlChange: (value: string) => void;
  onTestGemini: () => void;
  onTestN8n: () => void;
  onSave: () => void;
}> = props => {
  const geminiKeyIsUrl = /^https?:\/\//i.test(props.geminiApiKey.trim());
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-7 sm:py-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Tích hợp
        </h2>
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-slate-200 p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Gemini AI</h3>
                <p className="mt-0.5 text-sm text-slate-600">Dịch vụ phân tích và tổng hợp nội dung</p>
              </div>
            </div>
            {props.geminiTestSuccess === true && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Đã kết nối
              </span>
            )}
          </div>

          <label htmlFor="gemini-api-key" className="mt-6 block text-sm font-semibold text-slate-600">
            Khóa API Gemini
          </label>
          <div className="relative mt-2">
            <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              id="gemini-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              aria-describedby={geminiKeyIsUrl ? 'gemini-api-key-help' : undefined}
              aria-invalid={geminiKeyIsUrl || undefined}
              value={props.geminiApiKey}
              onChange={event => props.onGeminiKeyChange(event.target.value)}
              placeholder="Dán giá trị khóa API Gemini"
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
            />
          </div>

          {geminiKeyIsUrl && (
            <p id="gemini-api-key-help" role="alert" className="mt-2 text-sm leading-6 text-rose-700">
              Bạn đang nhập địa chỉ website. Hãy dán giá trị khóa API Gemini vào ô này.
            </p>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={props.onTestGemini}
              disabled={props.geminiTesting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.geminiTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {props.geminiTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
          </div>

          <ConnectionStatus
            success={props.geminiTestSuccess}
            text={props.geminiTestMessage}
          />
        </div>

        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-primary-600">
                <Workflow className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">n8n</h3>
                <p className="mt-0.5 text-sm text-slate-600">Điều phối các quy trình tự động</p>
              </div>
            </div>
            {props.n8nTestSuccess === true && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                Đã kết nối
              </span>
            )}
          </div>

          <label htmlFor="tv4-n8n-webhook" className="mt-6 block text-sm font-semibold text-slate-600">
            Địa chỉ webhook
          </label>
          <div className="relative mt-2">
            <Workflow className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
            <input
              id="tv4-n8n-webhook"
              type="text"
              value={props.n8nWebhookUrl}
              onChange={event => props.onN8nUrlChange(event.target.value)}
              placeholder="http://localhost:5678/webhook/..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-600 focus:bg-white focus:ring-4 focus:ring-primary-600/10"
            />
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={props.onTestN8n}
              disabled={props.n8nTesting || !props.n8nWebhookUrl.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {props.n8nTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {props.n8nTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
            </button>
          </div>

          <ConnectionStatus
            success={props.n8nTestSuccess}
            text={props.n8nTestMessage}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p
          className={`text-xs font-semibold ${
            props.configMessage.toLowerCase().includes('thành công')
              ? 'text-emerald-700'
              : props.configMessage
                ? 'text-rose-700'
                : 'text-slate-600'
          }`}
        >
          {props.configMessage || ' '}
        </p>

        <button
          type="button"
          onClick={props.onSave}
          disabled={props.configSaving}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {props.configSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {props.configSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </button>
      </div>
    </section>
  );
};

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('rbac');
  const [hrWorkspaceTab, setHrWorkspaceTab] =
    useState<'rag' | 'courses'>('courses');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');

  const [n8nTesting, setN8nTesting] = useState(false);
  const [n8nTestMessage, setN8nTestMessage] = useState('');
  const [n8nTestSuccess, setN8nTestSuccess] = useState<boolean | null>(null);

  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestMessage, setGeminiTestMessage] = useState('');
  const [geminiTestSuccess, setGeminiTestSuccess] =
    useState<boolean | null>(null);

  useEffect(() => {
    if (user?.role !== 'SUPERADMIN') return;

    const loadSystemConfig = async () => {
      try {
        const config = await systemConfigApi.get();
        setGeminiApiKey(config.geminiApiKey || '');
        setN8nWebhookUrl(config.n8nWebhookUrl || '');
      } catch (error) {
        console.error('Không thể tải cấu hình hệ thống:', error);
      }
    };

    loadSystemConfig();
  }, [user?.role]);

  const handleSaveConfig = async () => {
    if (/^https?:\/\//i.test(geminiApiKey.trim())) {
      setConfigMessage('Ô khóa API Gemini đang chứa địa chỉ website. Hãy thay bằng giá trị khóa API rồi lưu lại.');
      return;
    }
    const n8nUrl = n8nWebhookUrl.trim();

    if (n8nUrl) {
      try {
        const parsedUrl = new URL(n8nUrl);
        if (
          parsedUrl.protocol !== 'http:' &&
          parsedUrl.protocol !== 'https:'
        ) {
          setConfigMessage('Webhook n8n phải sử dụng http:// hoặc https://');
          return;
        }
      } catch {
        setConfigMessage('Địa chỉ n8n Webhook không hợp lệ.');
        return;
      }
    }

    try {
      setConfigSaving(true);
      setConfigMessage('');

      const result = await systemConfigApi.update({
        geminiApiKey: geminiApiKey || undefined,
        n8nWebhookUrl: n8nWebhookUrl || undefined,
      });

      setGeminiApiKey(result.geminiApiKey || '');
      setN8nWebhookUrl(result.n8nWebhookUrl || '');
      setConfigMessage('Đã lưu cấu hình thành công.');
    } catch (error) {
      console.error(error);
      setConfigMessage(error instanceof Error ? error.message : 'Lưu cấu hình thất bại.');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTestN8n = async () => {
    const url = n8nWebhookUrl.trim();

    if (!url) {
      setN8nTestSuccess(false);
      setN8nTestMessage('Vui lòng nhập n8n Webhook Endpoint.');
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.protocol !== 'http:' &&
        parsedUrl.protocol !== 'https:'
      ) {
        setN8nTestSuccess(false);
        setN8nTestMessage('Webhook phải sử dụng http:// hoặc https://');
        return;
      }
    } catch {
      setN8nTestSuccess(false);
      setN8nTestMessage('Địa chỉ n8n Webhook không hợp lệ.');
      return;
    }

    try {
      setN8nTesting(true);
      setN8nTestSuccess(null);
      setN8nTestMessage('Đang kiểm tra kết nối...');
      const result = await systemConfigApi.testN8n(url);
      setN8nTestSuccess(true);
      setN8nTestMessage(result.message || 'Kết nối n8n thành công.');
    } catch (error) {
      console.error(error);
      setN8nTestSuccess(false);
      setN8nTestMessage(
        error instanceof Error ? error.message : 'Không thể kết nối tới n8n.',
      );
    } finally {
      setN8nTesting(false);
    }
  };

  const handleTestGemini = async () => {
    try {
      setGeminiTesting(true);
      setGeminiTestSuccess(null);
      setGeminiTestMessage('Đang kiểm tra kết nối...');
      const result = await systemConfigApi.testGemini();
      setGeminiTestSuccess(result.success);
      setGeminiTestMessage(
        `${result.message}${result.model ? ` • ${result.model}` : ''}`,
      );
    } catch (error) {
      console.error(error);
      setGeminiTestSuccess(false);
      setGeminiTestMessage(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối tới Google Gemini AI.',
      );
    } finally {
      setGeminiTesting(false);
    }
  };

  if (user?.role === 'MANAGER' || user?.role === 'EMPLOYEE') {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">
            Không có quyền truy cập
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Khu vực quản trị chỉ dành cho SuperAdmin hoặc HR.
          </p>
        </div>
      </div>
    );
  }

  if (user?.role === 'HR') {
    return (
      <div className="tv4-ui tv4-workspace min-h-full bg-slate-50">
        <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Tri thức & Phát triển
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Quản lý nguồn tri thức và lộ trình đào tạo trong một không gian thống nhất.
                </p>
              </div>

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setHrWorkspaceTab('courses')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    hrWorkspaceTab === 'courses'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-white/70'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  Đào tạo & Phát triển
                </button>
                <button
                  type="button"
                  onClick={() => setHrWorkspaceTab('rag')}
                  className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition ${
                    hrWorkspaceTab === 'rag'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:bg-white/70'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  Kho tri thức
                </button>
              </div>
            </div>
          </div>

          {hrWorkspaceTab === 'courses' ? (
            <TrainingPanel presentation="admin" />
          ) : (
            <KnowledgeBasePanel presentation="admin" />
          )}
        </div>
      </div>
    );
  }


  return (
    <div className="tv4-ui tv4-workspace min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1560px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="grid items-start gap-6 lg:grid-cols-[212px_minmax(0,1fr)] xl:gap-7">
          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2 lg:sticky lg:top-6">
            <nav className="grid grid-cols-2 gap-1 lg:block lg:space-y-1" aria-label="Các mục cài đặt hệ thống">
              {NAV_ITEMS.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`tv4-nav-item relative flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-3 text-left transition ${
                      isActive
                        ? 'bg-white text-slate-900'
                        : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
                        isActive
                          ? 'bg-primary-50 text-primary-600'
                          : 'bg-transparent text-slate-600'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold leading-5 sm:text-sm">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0">
            {activeTab === 'rbac' && (
              <UserManagementPanel currentUserId={user!.id} />
            )}

            {activeTab === 'api' && (
              <IntegrationsPanel
                geminiApiKey={geminiApiKey}
                n8nWebhookUrl={n8nWebhookUrl}
                configSaving={configSaving}
                configMessage={configMessage}
                geminiTesting={geminiTesting}
                geminiTestMessage={geminiTestMessage}
                geminiTestSuccess={geminiTestSuccess}
                n8nTesting={n8nTesting}
                n8nTestMessage={n8nTestMessage}
                n8nTestSuccess={n8nTestSuccess}
                onGeminiKeyChange={value => {
                  setGeminiApiKey(value);
                  setConfigMessage('');
                  setGeminiTestSuccess(null);
                  setGeminiTestMessage('');
                }}
                onN8nUrlChange={value => {
                  setN8nWebhookUrl(value);
                  setConfigMessage('');
                  setN8nTestSuccess(null);
                  setN8nTestMessage('');
                }}
                onTestGemini={handleTestGemini}
                onTestN8n={handleTestN8n}
                onSave={handleSaveConfig}
              />
            )}

            {activeTab === 'rag' && <KnowledgeBasePanel presentation="admin" />}
            {activeTab === 'courses' && <TrainingPanel presentation="admin" />}
          </main>
        </div>
      </div>
    </div>
  );
};
