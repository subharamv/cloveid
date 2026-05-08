import React, { useEffect, useState, useMemo } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZES = [10, 25, 50];

const IssuedCards = () => {
  const [items, setItems] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [deptFilter, setDeptFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchIdFilter, setBatchIdFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [sortField, setSortField] = useState('card_created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: cards, error: cardsError } = await supabase
        .from('employee_card_details')
        .select('*')
        .not('card_id', 'is', null)
        .order('card_created_at', { ascending: false });

      if (cardsError) throw cardsError;

      const { data: profs } = await supabase.from('profiles').select('department').not('department', 'is', null);

      const deptList = Array.from(new Set((profs || []).map((p: any) => p.department))).filter(Boolean) as string[];
      const batchList = Array.from(new Set((cards || []).map((c: any) => c.batch_id).filter(Boolean))) as string[];

      setDepartments(deptList);
      setBatchIds(batchList);
      setItems(cards || []);
    } catch (err: any) {
      console.error('Error fetching issued cards:', err);
      toast.error('Failed to load issued cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    let result = [...items];

    if (deptFilter) {
      result = result.filter(i => (i.branch || '').toLowerCase() === deptFilter.toLowerCase());
    }
    if (batchIdFilter) {
      result = result.filter(i => (i.batch_id || '').toString().toLowerCase().includes(batchIdFilter.toLowerCase()));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        (i.name || '').toLowerCase().includes(q) ||
        (i.employee_id || '').toLowerCase().includes(q) ||
        (i.card_id || '').toString().toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(i => new Date(i.card_created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(i => new Date(i.card_created_at) <= to);
    }

    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (!aVal) return 1;
      if (!bVal) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : Number(aVal) - Number(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [items, deptFilter, batchIdFilter, searchQuery, dateFrom, dateTo, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="ml-1 text-gray-300 dark:text-gray-600">&#8597;</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '&#8593;' : '&#8595;'}</span>;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
      case 'sent_for_printing': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
      case 'ready_to_collect': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
      case 'printed': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
      case 'collected': return 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300';
      default: return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Pending';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        <AppHeader />
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
              <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold leading-tight tracking-[-0.033em] text-gray-900 dark:text-white">Issued ID Cards</h1>
                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">View all issued ID cards with filters</p>
              </div>
              <button onClick={fetchData} className="flex min-w-[40px] h-10 px-3 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Refresh">
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex flex-wrap gap-4 items-end">
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Department</label>
                <select
                  value={deptFilter}
                  onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="">All</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 min-w-[140px]">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Batch ID</label>
                <input
                  type="text"
                  placeholder="Filter by batch ID..."
                  value={batchIdFilter}
                  onChange={e => { setBatchIdFilter(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[130px]">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[130px]">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex flex-col gap-1 min-w-[200px] flex-1 max-w-md">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Search</label>
                <div className="flex items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <span className="material-symbols-outlined text-gray-400 mr-2 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Name, employee ID, or card ID..."
                    className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-white"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
            </div>

            {/* Results & Sort Info */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                {loading ? '' : ` — page ${safePage} of ${totalPages}`}
              </p>
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Sort by</label>
                <select
                  value={sortField}
                  onChange={e => { setSortField(e.target.value); setPage(1); }}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="card_created_at">Date</option>
                  <option value="name">Name</option>
                  <option value="employee_id">Employee ID</option>
                  <option value="card_id">Card ID</option>
                  <option value="batch_id">Batch ID</option>
                  <option value="card_status">Status</option>
                </select>
                <button
                  onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                  title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortDir === 'asc' ? <>&#8593; Asc</> : <>&#8595; Desc</>}
                </button>
              </div>
            </div>

            <div className="py-3">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      {[
                        { key: 'card_id', label: 'Card ID' },
                        { key: 'name', label: 'Employee Name' },
                        { key: 'employee_id', label: 'Employee ID' },
                        { key: 'branch', label: 'Branch' },
                        { key: 'batch_id', label: 'Batch ID' },
                        { key: 'card_status', label: 'Status' },
                        { key: 'card_created_at', label: 'Issued Date' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => toggleSort(col.key)}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
                        >
                          {col.label}
                          <SortIcon field={col.key} />
                        </th>
                      ))}
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                          </div>
                        </td>
                      </tr>
                    ) : paginated.length > 0 ? (
                      paginated.map(item => (
                        <tr key={item.card_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.card_id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.employee_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.branch || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.batch_id || '-'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.card_status)}`}>
                              {formatStatus(item.card_status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {item.card_created_at ? new Date(item.card_created_at).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => navigate('/employee-page', { state: { employeeId: item.employee_db_id } })}
                              className="text-primary hover:underline"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                          No issued cards found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                ) : paginated.length > 0 ? (
                  paginated.map((item) => (
                    <div key={item.card_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Card ID</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.card_id || '-'}</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.card_status)}`}>
                          {formatStatus(item.card_status)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee Name</p>
                          <p className="text-sm text-gray-900 dark:text-white">{item.name}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee ID</p>
                          <p className="text-sm text-gray-900 dark:text-white">{item.employee_id}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Branch</p>
                          <p className="text-sm text-gray-900 dark:text-white">{item.branch || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Batch ID</p>
                          <p className="text-sm text-gray-900 dark:text-white">{item.batch_id || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Issued Date</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {item.card_created_at ? new Date(item.card_created_at).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate('/employee-page', { state: { employeeId: item.employee_db_id } })}
                        className="w-full text-center text-primary hover:underline text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No issued cards found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 pb-8">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</label>
                <select
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &#171;
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &#8249;
                </button>

                <span className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                  Page {safePage} of {totalPages}
                </span>

                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &#8250;
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  &#187;
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default IssuedCards;
