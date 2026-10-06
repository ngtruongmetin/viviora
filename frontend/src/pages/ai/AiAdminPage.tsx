import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Database, FlaskConical, KeyRound, Save, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { aiApi, type AiConfig } from '../../services/domain';

const providerDefaults: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-20b' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  compatible: { baseUrl: '', model: '' },
};

export function AiAdminPage() {
  const client = useQueryClient(); const config = useQuery({ queryKey: ['ai-config'], queryFn: () => aiApi.config().then((r) => r.data.data) }); const stats = useQuery({ queryKey: ['ai-stats'], queryFn: () => aiApi.stats().then((r) => r.data.data) }); const [form, setForm] = useState<Partial<AiConfig> & { apiKey?: string }>({});
  const models = useQuery({ queryKey: ['ai-models', config.data?.baseUrl, config.data?.hasCredential], queryFn: () => aiApi.models().then((r) => r.data.data), enabled: Boolean(config.data?.hasCredential) });
  useEffect(() => { if (config.data) setForm(config.data); }, [config.data]);
  const save = useMutation({ mutationFn: () => aiApi.updateConfig(form), onSuccess: () => { toast.success('Đã lưu cấu hình AI.'); setForm((value) => ({ ...value, apiKey: '' })); client.invalidateQueries({ queryKey: ['ai-config'] }); }, onError: () => toast.error('Không thể lưu cấu hình.') });
  const test = useMutation({ mutationFn: () => aiApi.test(), onSuccess: () => toast.success('Kết nối provider thành công.'), onError: () => toast.error('Không thể kết nối provider.') });
  const field = <K extends keyof AiConfig>(name: K) => ({ value: String(form[name] ?? ''), onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((value) => ({ ...value, [name]: event.target.value })) });
  const modelOptions = Array.from(new Set([...(models.data || []), String(form.model || '')].filter(Boolean)));
  const setProvider = (provider: string) => { const preset = providerDefaults[provider]; setForm((value) => ({ ...value, provider, ...(preset ? { baseUrl: preset.baseUrl || value.baseUrl, model: preset.model || value.model } : {}) })); };
  return <div className="ai-admin-page"><section className="ai-hero"><div><span className="eyebrow">CORE BACKEND · AI CATALOG</span><h1>CẤU HÌNH AI</h1><p>Quản lý model, guardrail và truy xuất metadata sách trực tiếp từ PostgreSQL.</p></div><ShieldCheck size={70} /></section>
    <section className="ai-stat-grid"><Stat icon={<Database />} label="SÁCH LIVE" value={stats.data?.book_count} /><Stat icon={<Database />} label="KHO SÁCH" value={stats.data?.collection_count} /><Stat icon={<FlaskConical />} label="YÊU CẦU 30 NGÀY" value={stats.data?.request_count} /></section>
    <div className="ai-config-grid"><section className="ai-config-panel"><header><span>01</span><h2>LLM ENGINE</h2></header><label>PROVIDER<select value={form.provider || 'groq'} onChange={(e) => setProvider(e.target.value)}><option value="groq">Groq</option><option value="openai">OpenAI</option><option value="compatible">OpenAI-compatible</option></select></label><label>BASE URL<input {...field('baseUrl')} placeholder="https://api.groq.com/openai/v1" /></label><label>MODEL <small>{models.isFetching ? 'Đang tải model từ provider...' : models.data ? `${models.data.length} model khả dụng` : 'Lưu API key rồi tải lại trang để thấy model khả dụng.'}</small><select value={String(form.model || '')} onChange={(e) => setForm((value) => ({ ...value, model: e.target.value }))}>{modelOptions.map((model) => <option key={model} value={model}>{model}</option>)}</select></label><label>API KEY <small>{config.data?.credentialHint}</small><input type="password" value={form.apiKey || ''} onChange={(e) => setForm((value) => ({ ...value, apiKey: e.target.value }))} placeholder="Chỉ nhập để thay đổi" /></label><div className="ai-inline"><label>TEMPERATURE<input type="number" min="0" max="2" step="0.05" {...field('temperature')} /></label><label>MAX TOKENS<input type="number" min="128" max="4096" {...field('maxTokens')} /></label></div></section>
      <section className="ai-config-panel"><header><span>02</span><h2>GUARDRAIL & PROMPT</h2></header><label>SYSTEM PROMPT<textarea {...field('systemPrompt')} rows={12} /></label><label className="ai-switch"><input type="checkbox" checked={Boolean(form.isEnabled)} onChange={(e) => setForm((value) => ({ ...value, isEnabled: e.target.checked }))} /> BẬT TƯ VẤN AI</label><p className="ai-note"><KeyRound size={16} /> API key được mã hóa trong cơ sở dữ liệu; khóa chủ được cấp bằng Docker secret.</p><div className="ai-admin-actions"><button className="button secondary" onClick={() => test.mutate()} disabled={test.isPending}><FlaskConical size={17} /> KIỂM TRA</button><button className="button primary" onClick={() => save.mutate()} disabled={save.isPending}><Save size={17} /> LƯU CẤU HÌNH</button></div></section></div>
  </div>;
}
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value?: number }) { return <div className="ai-stat"><span>{icon}</span><small>{label}</small><strong>{typeof value === 'number' ? value.toLocaleString('vi-VN') : '...'}</strong></div>; }
