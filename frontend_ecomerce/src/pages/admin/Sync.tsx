import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { apiJson, ApiError } from '@/lib/api/client';
import { syncLogs, syncProducts, synchronizeProduct, type SyncAction, type SyncComparison, type SyncDirection, type SyncLog, type SyncProduct } from '@/src/features/admin/catalog-sync.api';

interface SectionState {
  products: SyncComparison[] | null;
  checkedAt: string | null;
  error: string | null;
  notice: string | null;
}

interface HealthCheck {
  checkedAt: string;
  services: Record<string, { label: string; ok: boolean; message: string; mode?: string; uptimeSeconds?: number }>;
}

const directions: SyncDirection[] = ['stripe_to_supabase', 'supabase_to_stripe'];
const names = {
  stripe_to_supabase: { source: 'Stripe', target: 'Supabase' },
  supabase_to_stripe: { source: 'Supabase', target: 'Stripe' },
};
const actions: Record<SyncAction, string> = { import: 'Importar produto', stock: 'Atualizar estoque', price: 'Atualizar valor', all: 'Produto, estoque e valor' };
const statuses: Record<SyncLog['status'], string> = { running: 'Em andamento', success: 'Concluído', skipped: 'Já cadastrado', error: 'Falhou' };
const emptySection = (): SectionState => ({ products: null, checkedAt: null, error: null, notice: null });
const surface = { backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' };
const date = (value: string) => new Date(value).toLocaleString('pt-BR');
const errorMessage = (cause: unknown) => cause instanceof Error ? cause.message : 'Não foi possível concluir a solicitação.';
const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toLocaleString('pt-BR')}`;

function money(product: SyncProduct | null) {
  if (!product || product.price === null || !product.currency) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: product.currency.toUpperCase() }).format(product.price);
}

function ComparisonCard({ item, direction, disabled, onSync }: { item: SyncComparison; direction: SyncDirection; disabled: boolean; onSync: (action: SyncAction) => void }) {
  const { source, target } = item;
  const labels = names[direction];
  return (
    <article className={`rounded-xl border p-4 space-y-4 ${item.existsInTarget ? 'bg-gray-100 border-gray-300' : 'border-[var(--color-border)] bg-[var(--color-background)]'}`} style={item.existsInTarget ? { backgroundColor: 'var(--color-surfaceHover)', borderColor: 'var(--color-borderLight)' } : undefined}>
      <div className="flex items-start gap-3">
        {source.images[0] && <img src={source.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover" loading="lazy" />}
        <div className="min-w-0">
          <h3 className="font-semibold break-words">{source.name}</h3>
          <p className="text-xs break-all mt-1">Código Stripe: {source.stripeProductId}</p>
          <p className="text-sm mt-1">{item.existsInTarget ? `Já cadastrado no ${labels.target}` : `Ainda não cadastrado no ${labels.target}`}{!source.active && ' • Arquivado na origem'}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead><tr><th className="py-2 pr-3">Campo</th><th className="pr-3">{labels.source}</th><th>{labels.target}</th></tr></thead>
          <tbody>
            <tr><th className="py-2 pr-3 font-medium">Estoque disponível</th><td className="pr-3">{source.stock ?? 'Não informado'}</td><td>{target ? target.stock ?? 'Não informado' : '—'}</td></tr>
            <tr><th className="py-2 pr-3 font-medium">Valor</th><td className="pr-3">{money(source)}</td><td>{target ? money(target) : '—'}</td></tr>
          </tbody>
        </table>
      </div>
      {((direction === 'stripe_to_supabase' ? target?.reserved : source.reserved) || 0) > 0 && <p className="text-xs">Reservado no Supabase: {direction === 'stripe_to_supabase' ? target?.reserved : source.reserved} unidade(s).</p>}
      <div className="text-sm space-y-1">
        {item.stockMismatch && <p><strong className="text-[var(--color-error)]">Diferença de estoque: {item.stockDifference === null ? 'estoque não informado em um dos sistemas' : `${signed(item.stockDifference)} unidade(s) na origem`}</strong></p>}
        {item.priceMismatch && <p><strong className="text-[var(--color-error)]">Diferença de valor: {item.priceDifference === null ? 'preço ou moeda incompatível' : item.priceDifference === 0 ? 'vínculo do preço ou preço padrão precisa de atualização' : `${signed(item.priceDifference)} ${source.currency?.toUpperCase()} na origem`}</strong></p>}
        {target && !item.stockMismatch && !item.priceMismatch && <p><span className="text-[var(--color-success)]">Estoque e valor sincronizados.</span></p>}
        {source.stockIssue && <p><span className="text-[var(--color-error)]">{source.stockIssue}</span></p>}
        {source.priceIssue && <p><span className="text-[var(--color-error)]">{source.priceIssue}</span></p>}
        {target?.stockIssue && <p>Destino: {target.stockIssue}</p>}
        {target?.priceIssue && <p>Destino: {target.priceIssue}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onSync('import')} disabled={disabled || item.existsInTarget || Boolean(source.stockIssue || source.priceIssue)}>Importar produto</Button>
        <Button size="sm" variant="secondary" onClick={() => onSync('stock')} disabled={disabled || !item.existsInTarget || Boolean(source.stockIssue)}>Atualizar estoque</Button>
        <Button size="sm" variant="secondary" onClick={() => onSync('price')} disabled={disabled || !item.existsInTarget || Boolean(source.priceIssue)}>Atualizar valor</Button>
      </div>
    </article>
  );
}

export default function AdminSync() {
  const [sections, setSections] = useState<Record<SyncDirection, SectionState>>({ stripe_to_supabase: emptySection(), supabase_to_stripe: emptySection() });
  const [busy, setBusy] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [progress, setProgress] = useState<{ direction: SyncDirection; current: number; total: number } | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [logError, setLogError] = useState<string | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  function updateSection(direction: SyncDirection, values: Partial<SectionState>) {
    setSections((current) => ({ ...current, [direction]: { ...current[direction], ...values } }));
  }

  async function loadLogs() {
    setLogsLoading(true);
    try { setLogs((await syncLogs()).logs); setLogError(null); }
    catch (cause) { setLogError(errorMessage(cause)); }
    finally { setLogsLoading(false); }
  }

  useEffect(() => { void loadLogs(); }, []);

  async function search(direction: SyncDirection) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(`search:${direction}`);
    updateSection(direction, { error: null, notice: null });
    try { updateSection(direction, await syncProducts(direction)); }
    catch (cause) { updateSection(direction, { error: errorMessage(cause), products: null, checkedAt: null }); }
    finally { busyRef.current = false; setBusy(null); }
  }

  function applyComparison(direction: SyncDirection, product: SyncComparison) {
    setSections((current) => {
      const opposite = direction === 'stripe_to_supabase' ? 'supabase_to_stripe' : 'stripe_to_supabase';
      return {
        ...current,
        [direction]: { ...current[direction], products: current[direction].products?.map((item) => item.source.id === product.source.id ? product : item) || null },
        // A próxima busca recarrega a outra origem, incluindo produtos recém-importados.
        [opposite]: { ...emptySection(), notice: 'O catálogo mudou. Busque novamente para comparar os dados atuais.' },
      };
    });
  }

  async function runSync(direction: SyncDirection, action: SyncAction, productId?: string) {
    if (busyRef.current) return;
    const products = sections[direction].products;
    if (!products) return;
    const selected = productId ? products.filter((item) => item.source.id === productId) : products;
    if (!selected.length) return;
    busyRef.current = true;
    setBusy(`sync:${direction}`);
    updateSection(direction, { error: null, notice: null });
    const batchId = productId ? undefined : crypto.randomUUID();
    let success = 0;
    let skipped = 0;
    const failures: string[] = [];
    let processed = 0;
    try {
      for (const item of selected) {
        setProgress({ direction, current: processed, total: selected.length });
        try {
          const result = await synchronizeProduct(direction, action, item.source.id, batchId);
          applyComparison(direction, result.product);
          if (result.status === 'skipped') skipped += 1; else success += 1;
        } catch (cause) {
          failures.push(`${item.source.name} (${item.source.stripeProductId}): ${errorMessage(cause)}`);
          // Autorização, auditoria e limite de requisições exigem interromper o lote.
          if (cause instanceof ApiError && ([401, 403, 429, 503].includes(cause.status))) { processed += 1; break; }
        }
        processed += 1;
        // Mantém lotes grandes abaixo do limite global de 180 requisições/minuto.
        if (batchId && processed < selected.length) await new Promise((resolve) => setTimeout(resolve, 400));
      }
      updateSection(direction, {
        checkedAt: null,
        notice: `${success} concluído(s), ${skipped} já cadastrado(s), ${failures.length} falha(s)${processed < selected.length ? ` e ${selected.length - processed} não processado(s)` : ''}.`,
        error: failures.length ? `${failures.slice(0, 3).join('\n')}${failures.length > 3 ? '\nConsulte os logs para as demais falhas.' : ''}` : null,
      });
      if (failures.length) {
        // Pode haver efeito parcial entre serviços; nunca mantém comparação antiga.
        setSections((current) => ({ stripe_to_supabase: { ...current.stripe_to_supabase, products: null }, supabase_to_stripe: { ...current.supabase_to_stripe, products: null } }));
      }
      await loadLogs();
    } finally { setProgress(null); busyRef.current = false; setBusy(null); }
  }

  async function checkHealth() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy('health');
    setHealthError(null);
    try { setHealth(await apiJson<HealthCheck>('/api/admin/health')); }
    catch (cause) { setHealthError(errorMessage(cause)); setHealth(null); }
    finally { busyRef.current = false; setBusy(null); }
  }

  return (
    <div className="min-h-screen text-[var(--color-text)] bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" />Voltar ao ADM</Link>
        <header className="rounded-2xl p-5 sm:p-6 space-y-3" style={surface}>
          <h1 className="text-2xl sm:text-3xl font-bold">Sincronização de produtos</h1>
          <p className="text-[var(--color-textSecondary)]">Escolha a origem dos dados. Produtos em cinza já existem no destino, identificados pelo código do produto Stripe.</p>
          <p className="text-sm text-[var(--color-textSecondary)]">As ações copiam os dados da origem para o destino. O estoque disponível preserva as reservas de pedidos. Importar todos também atualiza produtos já cadastrados, estoque e valor.</p>
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void checkHealth()}><Activity className="h-4 w-4" />{busy === 'health' ? 'Testando...' : 'Testar conexões'}</Button>
          {healthError && <div role="alert" className="text-[var(--color-error)]">{healthError}</div>}
          {health && <div className="space-y-3">
            <p className="text-xs">Verificado em {date(health.checkedAt)}</p>
            <div className="grid sm:grid-cols-3 gap-3">{Object.values(health.services).map((service) => <div key={service.label} className="border border-[var(--color-border)] rounded-lg p-3">
              <p><strong className={service.ok ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}>{service.label}: {service.ok ? 'Conectado' : 'Falha'}</strong></p>
              <p className="text-sm">{service.message}</p>
              {service.mode && <p className="text-xs mt-1">Modo: {service.mode}</p>}
              {service.uptimeSeconds !== undefined && <p className="text-xs mt-1">Uptime: {service.uptimeSeconds}s</p>}
            </div>)}</div>
          </div>}
        </header>

        {directions.map((direction, index) => {
          const section = sections[direction];
          return <section key={direction} className="rounded-2xl p-5 sm:p-6 space-y-4" style={surface} aria-labelledby={`${direction}-title`} aria-busy={busy?.endsWith(direction) || false}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 id={`${direction}-title`} className="text-xl font-bold flex flex-wrap items-center gap-2">{index + 1}. {names[direction].source}<ArrowRight className="h-5 w-5" />{names[direction].target}</h2>
                {section.checkedAt && <p className="text-xs mt-2 text-[var(--color-textSecondary)]">Consulta em {date(section.checkedAt)}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void search(direction)}><RefreshCw className="h-4 w-4" />{busy === `search:${direction}` ? 'Buscando...' : `Buscar produtos do ${names[direction].source}`}</Button>
                <Button disabled={Boolean(busy) || !section.products?.length} onClick={() => void runSync(direction, 'all')}>Importar todos: produtos, estoque e valor</Button>
              </div>
            </div>
            {section.notice && <p role="status" className="text-sm whitespace-pre-line">{section.notice}</p>}
            {section.error && <div role="alert" className="text-sm whitespace-pre-line text-[var(--color-error)]">{section.error}</div>}
            {progress?.direction === direction && <div role="status" aria-live="polite"><p className="text-sm mb-2">Sincronizando {progress.current + 1} de {progress.total}...</p><progress className="w-full" value={progress.current} max={progress.total} /></div>}
            {section.products === null ? <p className="text-sm text-[var(--color-textSecondary)]">Clique em buscar para carregar todos os produtos e comparar os dois sistemas.</p> : section.products.length === 0 ? <p>Nenhum produto nesta origem.</p> : <>
              <p className="text-sm">{section.products.length} produto(s) • {section.products.filter((item) => item.existsInTarget).length} já cadastrado(s) no destino</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{section.products.map((item) => <ComparisonCard key={item.source.id} item={item} direction={direction} disabled={Boolean(busy)} onSync={(action) => void runSync(direction, action, item.source.id)} />)}</div>
            </>}
          </section>;
        })}

        <section className="rounded-2xl p-5 sm:p-6 space-y-4" style={surface}>
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Logs de sincronização</h2><p className="text-sm text-[var(--color-textSecondary)]">Últimas 100 operações. Todas as operações são salvas no banco.</p></div><Button size="sm" variant="secondary" disabled={Boolean(busy) || logsLoading} onClick={() => void loadLogs()}>{logsLoading ? 'Carregando...' : 'Atualizar logs'}</Button></div>
          {logError && <div role="alert" className="text-[var(--color-error)]">{logError}</div>}
          {!logsLoading && !logs.length && !logError && <p className="text-sm">Nenhuma sincronização registrada.</p>}
          <div className="space-y-3">{logs.map((log) => <details key={log.id} className="rounded-lg border border-[var(--color-border)] p-3">
            <summary className="cursor-pointer text-sm">{date(log.created_at)} • {names[log.direction].source} → {names[log.direction].target} • {actions[log.action]} • {log.stripe_product_id || log.source_product_id} • <span className={log.status === 'error' ? 'text-[var(--color-error)]' : ''}>{statuses[log.status]}</span></summary>
            <div className="mt-3 space-y-2 text-sm"><p>{log.message || 'Operação iniciada; consulte novamente para ver o resultado.'}</p><p className="text-xs break-all">Operação: {log.id} • Administrador: {log.actor_id || 'Conta removida'}{log.batch_id && ` • Lote: ${log.batch_id}`}</p>
              <div className="overflow-x-auto"><table className="text-sm w-full text-left"><thead><tr><th className="pr-4 py-2">Destino</th><th className="pr-4">Estoque</th><th>Valor</th></tr></thead><tbody><tr><th className="pr-4 py-2">Antes</th><td>{log.before_state?.target?.stock ?? '—'}</td><td>{money(log.before_state?.target || null)}</td></tr><tr><th className="pr-4 py-2">Depois</th><td>{log.after_state?.target?.stock ?? '—'}</td><td>{money(log.after_state?.target || null)}</td></tr></tbody></table></div>
            </div>
          </details>)}</div>
        </section>
      </div>
    </div>
  );
}
