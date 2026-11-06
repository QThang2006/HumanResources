import { useEffect, useState } from 'react';
import { recruitmentApi as api } from './api';
import type { Capabilities, DepartmentManager, Job, JobInput, Lookup } from './types';
import { Alert, Dialog, Field, buttonClass, errorText, inputClass, secondaryClass } from './ui';
import { Sparkles, Check } from 'lucide-react';

export function JobEditor({
  job,
  capabilities,
  close,
  saved,
}: {
  job: Job | null;
  capabilities: Capabilities | null;
  close: () => void;
  saved: (job: Job) => void;
}) {
  const [input, setInput] = useState<JobInput>(() =>
    job
      ? {
          title: job.title,
          departmentId: job.departmentId,
          location: job.location || '',
          salaryRange: job.salaryRange || '',
          description: job.description,
          requirements: job.requirements,
          level: job.level || 'Middle',
          employmentType: job.employmentType || 'Toàn thời gian',
          experienceYears: job.experienceYears || '1 - 3 năm',
          headcount: job.headcount ?? 1,
          deadline: job.deadline ? String(job.deadline).split('T')[0] : '',
          benefits: job.benefits || '',
          skills: job.skills || '',
        }
      : {
          title: '',
          departmentId: 0,
          location: 'Hà Nội',
          salaryRange: 'Thỏa thuận',
          description: '',
          requirements: '',
          level: 'Middle',
          employmentType: 'Toàn thời gian',
          experienceYears: '1 - 3 năm',
          headcount: 1,
          deadline: '',
          benefits: '',
          skills: '',
        },
  );
  const [departments, setDepartments] = useState<Lookup[]>([]);
  const [level, setLevel] = useState(input.level || 'Middle');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [departmentFormOpen, setDepartmentFormOpen] = useState(false);
  const [departmentInput, setDepartmentInput] = useState({
    name: '',
    code: '',
    description: '',
    managerId: '',
  });
  const [departmentManagers, setDepartmentManagers] = useState<DepartmentManager[]>([]);
  const [managersError, setManagersError] = useState('');
  const [managersLoading, setManagersLoading] = useState(false);
  const [managersAttempt, setManagersAttempt] = useState(0);
  const [departmentBusy, setDepartmentBusy] = useState(false);
  const [preview, setPreview] = useState<{
    mode: string;
    data: { description: string; requirements: string; benefits: string };
  } | null>(null);

  useEffect(() => {
    let active = true;
    api
      .departments()
      .then((data) => {
        if (active) {
          setDepartments(data);
          setLookupError('');
        }
      })
      .catch((e) => {
        if (active) setLookupError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [lookupAttempt]);

  useEffect(() => {
    if (!departmentFormOpen) return;
    let active = true;
    setManagersLoading(true);
    setManagersError('');
    api
      .departmentManagers()
      .then((data) => {
        if (active) setDepartmentManagers(data);
      })
      .catch((e) => {
        if (active) setManagersError(errorText(e));
      })
      .finally(() => {
        if (active) setManagersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [departmentFormOpen, managersAttempt]);

  const field = (key: keyof JobInput, value: string | number) =>
    setInput((current) => ({ ...current, [key]: value }));

  async function createDepartment() {
    if (departmentBusy) return;
    setDepartmentBusy(true);
    setError('');
    try {
      const created = await api.createDepartment({
        ...departmentInput,
        managerId: departmentInput.managerId ? Number(departmentInput.managerId) : undefined,
      });
      setDepartments((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      field('departmentId', created.id);
      setDepartmentInput({ name: '', code: '', description: '', managerId: '' });
      setDepartmentFormOpen(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setDepartmentBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    setError('');
    try {
      setPreview(
        await api.jd(
          input.title,
          departments.find((d) => d.id === input.departmentId)?.name || '',
          input.level || level,
        ),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      saved(job ? await api.updateJob(job, input) : await api.createJob(input));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={job ? 'Chỉnh sửa vị trí tuyển dụng' : 'Tạo vị trí tuyển dụng mới'}
      close={() => {
        if (!busy) close();
      }}
    >
      <form onSubmit={submit} className="space-y-6">
        {error && <Alert>{error}</Alert>}
        {lookupError && (
          <Alert>
            Không tải được phòng ban: {lookupError}{' '}
            <button
              type="button"
              className={secondaryClass}
              onClick={() => setLookupAttempt((value) => value + 1)}
            >
              Tải lại phòng ban
            </button>
          </Alert>
        )}

        <fieldset disabled={busy} className="space-y-5">
          {/* SECTION 1: THÔNG TIN CƠ BẢN */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              1. Thông Tin Chức Danh & Phòng Ban
            </h4>

            <Field label="Tên vị trí tuyển dụng *">
              <input
                required
                maxLength={200}
                className={inputClass}
                placeholder="Ví dụ: Kỹ sư Backend NestJS, Chuyên viên Tuyển dụng..."
                value={input.title}
                onChange={(e) => field('title', e.target.value)}
              />
            </Field>

            <Field label="Phòng ban phụ trách *">
              <div className="flex gap-2">
                <select
                  required
                  className={inputClass}
                  value={input.departmentId || ''}
                  onChange={(e) => field('departmentId', Number(e.target.value))}
                >
                  <option value="">Chọn phòng ban</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
                {!job && (
                  <button
                    type="button"
                    className={secondaryClass}
                    onClick={() => setDepartmentFormOpen((open) => !open)}
                  >
                    {departmentFormOpen ? 'Đóng' : '+ Tạo'}
                  </button>
                )}
              </div>
            </Field>

            {departmentFormOpen && !job && (
              <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
                <p className="text-sm font-semibold text-blue-900">Tạo phòng ban mới</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    maxLength={100}
                    className={inputClass}
                    placeholder="Tên phòng ban"
                    value={departmentInput.name}
                    onChange={(e) => setDepartmentInput((value) => ({ ...value, name: e.target.value }))}
                  />
                  <input
                    required
                    maxLength={20}
                    className={inputClass}
                    placeholder="Mã phòng ban (VD: TECH)"
                    value={departmentInput.code}
                    onChange={(e) => setDepartmentInput((value) => ({ ...value, code: e.target.value }))}
                  />
                </div>
                <input
                  maxLength={2000}
                  className={inputClass}
                  placeholder="Mô tả (không bắt buộc)"
                  value={departmentInput.description}
                  onChange={(e) =>
                    setDepartmentInput((value) => ({ ...value, description: e.target.value }))
                  }
                />
                <label className="block text-sm font-medium text-slate-700">
                  Manager phụ trách (không bắt buộc)
                  <select
                    className={inputClass + ' mt-1.5'}
                    value={departmentInput.managerId}
                    disabled={managersLoading || !!managersError}
                    onChange={(e) =>
                      setDepartmentInput((value) => ({ ...value, managerId: e.target.value }))
                    }
                  >
                    <option value="">{managersLoading ? 'Đang tải nhân sự...' : 'Chưa bổ nhiệm'}</option>
                    {departmentManagers.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.fullName} · {person.email} · {person.jobTitle || 'Chưa có chức danh'} · {person.role}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    EMPLOYEE sẽ được nâng thành MANAGER; HR giữ vai trò HR. SuperAdmin không xuất hiện trong danh sách này.
                  </span>
                </label>
                {managersError && (
                  <Alert>
                    Không tải được danh sách nhân sự: {managersError}{' '}
                    <button
                      type="button"
                      className={secondaryClass}
                      onClick={() => setManagersAttempt((value) => value + 1)}
                    >
                      Tải lại
                    </button>
                  </Alert>
                )}
                <button
                  type="button"
                  className={buttonClass}
                  disabled={departmentBusy}
                  onClick={createDepartment}
                >
                  {departmentBusy ? 'Đang tạo...' : 'Lưu phòng ban'}
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: CÁC CỘT THÔNG SỐ TUYỂN DỤNG ĐỊNH LƯỢNG */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              2. Các Cột Thông Số Tuyển Dụng (Định Lượng)
            </h4>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Cấp bậc">
                <select
                  className={inputClass}
                  value={input.level || 'Middle'}
                  onChange={(e) => {
                    field('level', e.target.value);
                    setLevel(e.target.value);
                  }}
                >
                  <option value="Intern">Thực tập sinh (Intern)</option>
                  <option value="Fresher">Khởi đầu (Fresher)</option>
                  <option value="Junior">Junior</option>
                  <option value="Middle">Middle</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead / Manager">Trưởng nhóm / Quản lý</option>
                </select>
              </Field>

              <Field label="Hình thức làm việc">
                <select
                  className={inputClass}
                  value={input.employmentType || 'Toàn thời gian'}
                  onChange={(e) => field('employmentType', e.target.value)}
                >
                  <option value="Toàn thời gian">Toàn thời gian (Full-time)</option>
                  <option value="Bán thời gian">Bán thời gian (Part-time)</option>
                  <option value="Thực tập sinh">Thực tập (Internship)</option>
                  <option value="Hybrid">Hybrid (Linh hoạt)</option>
                </select>
              </Field>

              <Field label="Số lượng tuyển">
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  value={input.headcount ?? 1}
                  onChange={(e) => field('headcount', Number(e.target.value))}
                />
              </Field>

              <Field label="Hạn nộp hồ sơ">
                <input
                  type="date"
                  className={inputClass}
                  value={input.deadline || ''}
                  onChange={(e) => field('deadline', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Địa điểm làm việc *">
                <input
                  required
                  maxLength={150}
                  className={inputClass}
                  placeholder="Ví dụ: Hà Nội, TP.HCM, Remote"
                  value={input.location}
                  onChange={(e) => field('location', e.target.value)}
                />
              </Field>

              <Field label="Mức thu nhập / Lương *">
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  placeholder="Ví dụ: 15 - 25 triệu, Thỏa thuận"
                  value={input.salaryRange}
                  onChange={(e) => field('salaryRange', e.target.value)}
                />
              </Field>

              <Field label="Kinh nghiệm yêu cầu">
                <input
                  maxLength={50}
                  className={inputClass}
                  placeholder="Ví dụ: 1 - 3 năm, Không yêu cầu"
                  value={input.experienceYears || ''}
                  onChange={(e) => field('experienceYears', e.target.value)}
                />
              </Field>
            </div>

            <Field label="Thẻ kỹ năng & Từ khóa (Ngăn cách bằng dấu phẩy)">
              <input
                maxLength={500}
                className={inputClass}
                placeholder="Ví dụ: React, TypeScript, NestJS, MySQL, Docker, RESTful API"
                value={input.skills || ''}
                onChange={(e) => field('skills', e.target.value)}
              />
            </Field>
          </div>

          {/* SECTION 3: TRỢ LÝ AI GỢI Ý JD */}
          <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-950">Trợ Lý AI Soạn Thảo JD Tuyển Dụng</span>
              </div>
              <button
                type="button"
                className={secondaryClass}
                disabled={
                  !capabilities?.jd || !input.title.trim() || !input.departmentId || busy
                }
                onClick={generate}
              >
                Gợi ý JD bằng AI
              </button>
            </div>

            <p className="text-xs text-slate-600">
              AI Gemini sẽ tự động tạo trọn gói Bản mô tả công việc, Tiêu chí ứng viên và Khối quyền lợi theo đúng vị trí và phòng ban đã chọn.
            </p>

            {preview && (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 mt-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h5 className="text-sm font-bold text-slate-900">
                    Bản nháp gợi ý từ AI ({preview.mode === 'MOCK' ? 'Mô phỏng' : 'Gemini LIVE'})
                  </h5>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
                    onClick={() => {
                      setInput((current) => ({
                        ...current,
                        description: preview.data.description,
                        requirements: preview.data.requirements,
                        benefits: preview.data.benefits || current.benefits,
                      }));
                      setPreview(null);
                    }}
                  >
                    <Check className="h-3.5 w-3.5" /> Áp dụng vào biểu mẫu
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-3 text-xs text-slate-700">
                  <div>
                    <strong className="text-blue-700">Mô tả công việc:</strong>
                    <p className="whitespace-pre-wrap mt-0.5">{preview.data.description}</p>
                  </div>
                  <div>
                    <strong className="text-emerald-700">Yêu cầu ứng viên:</strong>
                    <p className="whitespace-pre-wrap mt-0.5">{preview.data.requirements}</p>
                  </div>
                  {preview.data.benefits && (
                    <div>
                      <strong className="text-amber-700">Chế độ đãi ngộ:</strong>
                      <p className="whitespace-pre-wrap mt-0.5">{preview.data.benefits}</p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* SECTION 4: VĂN BẢN CHI TIẾT */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1.5">
              3. Nội Dung Chi Tiết
            </h4>

            <Field label="Mô tả công việc (Job Description) *">
              <textarea
                required
                rows={6}
                maxLength={20000}
                className={inputClass}
                placeholder="Trách nhiệm công việc, nhiệm vụ chính hàng ngày..."
                value={input.description}
                onChange={(e) => field('description', e.target.value)}
              />
            </Field>

            <Field label="Yêu cầu ứng viên (Requirements) *">
              <textarea
                required
                rows={6}
                maxLength={20000}
                className={inputClass}
                placeholder="Kỹ năng chuyên môn, kinh nghiệm, thái độ làm việc..."
                value={input.requirements}
                onChange={(e) => field('requirements', e.target.value)}
              />
            </Field>

            <Field label="Chế độ đãi ngộ & Quyền lợi (Benefits)">
              <textarea
                rows={4}
                maxLength={20000}
                className={inputClass}
                placeholder="Lương tháng 13, BHXH đầy đủ, thưởng dự án, lộ trình đào tạo Onboarding..."
                value={input.benefits || ''}
                onChange={(e) => field('benefits', e.target.value)}
              />
            </Field>
          </div>
        </fieldset>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            className={secondaryClass}
            disabled={busy}
            onClick={close}
          >
            Hủy
          </button>
          <button className={buttonClass} disabled={busy}>
            {busy ? 'Đang lưu...' : job ? 'Lưu thay đổi' : 'Đăng tuyển công việc'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
