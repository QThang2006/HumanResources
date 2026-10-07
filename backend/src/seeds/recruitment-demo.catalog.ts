export const DEMO_MARKER = '[DEMO TV2]';
export const DEMO_EMAIL_PREFIX = 'tv2.demo.';

export interface DemoJobSpec {
  key: string;
  title: string;
  location: string;
  salary: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  skills: string[];
  project: string;
  closed?: boolean;
}

export const DEMO_JOBS: DemoJobSpec[] = [
  {
    key: 'backend-nestjs', title: 'Backend Engineer (NestJS / TypeScript)', location: 'Hồ Chí Minh', salary: '25 - 40 triệu VND',
    summary: 'Tham gia đội nền tảng nhân sự, xây dựng API tuyển dụng và các dịch vụ tích hợp phục vụ hàng nghìn hồ sơ mỗi tháng.',
    responsibilities: ['Thiết kế REST API có phân quyền và kiểm tra dữ liệu đầu vào.', 'Tối ưu truy vấn MySQL, transaction và cơ chế chống xử lý trùng.', 'Tích hợp webhook, viết kiểm thử và tham gia review mã nguồn.'],
    requirements: ['Từ 2 năm kinh nghiệm TypeScript, Node.js và NestJS.', 'Hiểu cơ sở dữ liệu quan hệ, index và transaction.', 'Có kinh nghiệm JWT, Docker, Git và kiểm thử API.'],
    skills: ['TypeScript', 'NestJS', 'MySQL', 'REST API', 'Docker'], project: 'Recruitment API with transaction-safe scheduling and private CV storage',
  },
  {
    key: 'frontend-react', title: 'Frontend Engineer (React / TypeScript)', location: 'Hà Nội', salary: '22 - 35 triệu VND',
    summary: 'Phát triển trải nghiệm tuyển dụng nhanh, dễ sử dụng cho HR, người phỏng vấn và ứng viên trên desktop lẫn điện thoại.',
    responsibilities: ['Xây dựng component React và tích hợp API nghiệp vụ.', 'Thiết kế trạng thái loading, lỗi, biểu mẫu và phân trang.', 'Cải thiện khả năng truy cập, hiệu năng và responsive.'],
    requirements: ['Từ 2 năm kinh nghiệm React và TypeScript.', 'Sử dụng tốt HTML, CSS, state management và Git.', 'Biết kiểm thử giao diện và xử lý request bất đồng bộ.'],
    skills: ['React', 'TypeScript', 'CSS', 'Accessibility', 'Vitest'], project: 'Responsive applicant tracking board with keyboard navigation',
  },
  {
    key: 'fullstack', title: 'Fullstack Developer (Node.js / React)', location: 'Đà Nẵng', salary: '25 - 42 triệu VND',
    summary: 'Phụ trách một tính năng xuyên suốt từ giao diện tới API và cơ sở dữ liệu, phối hợp cùng Product và QA để đưa sản phẩm vào vận hành.',
    responsibilities: ['Phân tích yêu cầu và triển khai tính năng từ frontend tới backend.', 'Thiết kế schema, API contract và luồng xử lý lỗi.', 'Viết kiểm thử, tài liệu và hỗ trợ triển khai sản phẩm.'],
    requirements: ['Thành thạo React, Node.js và TypeScript.', 'Có kinh nghiệm PostgreSQL hoặc MySQL.', 'Biết CI/CD, Docker và quy trình code review.'],
    skills: ['React', 'Node.js', 'TypeScript', 'SQL', 'CI/CD'], project: 'Employee self-service portal with audited REST APIs',
  },
  {
    key: 'qa-automation', title: 'QA Automation Engineer', location: 'Hồ Chí Minh', salary: '20 - 32 triệu VND',
    summary: 'Xây dựng bộ kiểm thử tự động cho các luồng nghiệp vụ quan trọng, giúp đội phát triển phát hiện lỗi trước mỗi lần phát hành.',
    responsibilities: ['Thiết kế test case từ yêu cầu và các tình huống biên.', 'Tự động hóa kiểm thử API và giao diện web.', 'Phân tích lỗi, quản lý dữ liệu test và tích hợp test vào CI.'],
    requirements: ['Từ 2 năm kinh nghiệm kiểm thử phần mềm.', 'Có kinh nghiệm Playwright hoặc Cypress và JavaScript.', 'Đọc hiểu SQL, HTTP và quy trình báo cáo lỗi.'],
    skills: ['Playwright', 'JavaScript', 'API Testing', 'SQL', 'CI/CD'], project: 'Regression suite covering authentication and recruitment workflows',
  },
  {
    key: 'devops', title: 'DevOps Engineer / Site Reliability', location: 'Hybrid - Hồ Chí Minh', salary: '30 - 48 triệu VND',
    summary: 'Vận hành nền tảng triển khai và quan sát hệ thống, giúp dịch vụ ổn định, có khả năng khôi phục và được phát hành an toàn.',
    responsibilities: ['Xây dựng pipeline CI/CD và quản lý môi trường chạy.', 'Thiết lập monitoring, cảnh báo và quy trình ứng phó sự cố.', 'Quản lý backup, secret và cấu hình hạ tầng bằng mã.'],
    requirements: ['Có kinh nghiệm Linux, Docker và một nền tảng cloud.', 'Hiểu mạng, bảo mật và vận hành cơ sở dữ liệu.', 'Có kinh nghiệm Terraform, logging và monitoring.'],
    skills: ['Linux', 'Docker', 'Terraform', 'Prometheus', 'CI/CD'], project: 'Container deployment pipeline with backup and incident runbooks',
  },
  {
    key: 'data-engineer', title: 'Data Engineer', location: 'Hà Nội', salary: '28 - 45 triệu VND',
    summary: 'Xây dựng pipeline dữ liệu phục vụ báo cáo vận hành và phân tích tuyển dụng, bảo đảm dữ liệu đúng, đầy đủ và có thể truy vết.',
    responsibilities: ['Phát triển pipeline ETL và kiểm tra chất lượng dữ liệu.', 'Thiết kế mô hình dữ liệu phục vụ BI và báo cáo.', 'Tối ưu lịch chạy, xử lý dữ liệu trùng và tài liệu hóa nguồn dữ liệu.'],
    requirements: ['Thành thạo SQL và Python.', 'Có kinh nghiệm Airflow, dbt hoặc công cụ ETL tương đương.', 'Hiểu data warehouse, mô hình dữ liệu và kiểm thử pipeline.'],
    skills: ['Python', 'SQL', 'Airflow', 'dbt', 'Data Modeling'], project: 'Daily recruitment analytics pipeline with data quality checks',
  },
  {
    key: 'ai-engineer', title: 'AI / Machine Learning Engineer', location: 'Remote - Việt Nam', salary: '30 - 50 triệu VND',
    summary: 'Phát triển và đánh giá các tính năng AI hỗ trợ công việc; ưu tiên chất lượng đầu ra, khả năng đo lường và kiểm soát dữ liệu.',
    responsibilities: ['Xây dựng API tích hợp mô hình và chuẩn hóa đầu ra.', 'Thiết kế bộ đánh giá, xử lý fallback và giới hạn tốc độ.', 'Theo dõi chất lượng, chi phí và quyền riêng tư của dữ liệu.'],
    requirements: ['Có kinh nghiệm Python, machine learning và REST API.', 'Hiểu LLM, embeddings, evaluation và prompt injection.', 'Biết triển khai mô hình và kiểm thử chất lượng đầu ra.'],
    skills: ['Python', 'Machine Learning', 'LLM', 'Evaluation', 'FastAPI'], project: 'Structured document analysis service with evaluation datasets',
  },
  {
    key: 'business-analyst', title: 'Business Analyst (Sản phẩm HR Tech)', location: 'Hồ Chí Minh', salary: '20 - 30 triệu VND',
    summary: 'Kết nối nhu cầu của HR với đội kỹ thuật, chuyển quy trình tuyển dụng thành yêu cầu rõ ràng và tiêu chí nghiệm thu có thể kiểm chứng.',
    responsibilities: ['Khảo sát quy trình và mô tả luồng nghiệp vụ.', 'Viết user story, acceptance criteria và quản lý thay đổi.', 'Phối hợp UAT, kiểm tra dữ liệu báo cáo và hướng dẫn sử dụng.'],
    requirements: ['Có kinh nghiệm phân tích sản phẩm hoặc hệ thống nghiệp vụ.', 'Sử dụng được BPMN, SQL cơ bản và công cụ quản lý yêu cầu.', 'Giao tiếp rõ ràng, tư duy quy trình và xử lý tình huống biên.'],
    skills: ['BPMN', 'SQL', 'User Stories', 'UAT', 'Stakeholder Management'], project: 'Recruitment process redesign with traceable acceptance criteria',
  },
  {
    key: 'product-designer', title: 'Product Designer (UI / UX)', location: 'Đà Nẵng', salary: '20 - 33 triệu VND',
    summary: 'Thiết kế giao diện nghiệp vụ rõ ràng, nhất quán và có khả năng truy cập, giúp người dùng hoàn thành công việc với ít thao tác hơn.',
    responsibilities: ['Nghiên cứu người dùng và xây dựng prototype.', 'Thiết kế biểu mẫu, bảng dữ liệu và trạng thái tương tác.', 'Phối hợp xây dựng design system và kiểm tra giao diện sau triển khai.'],
    requirements: ['Có portfolio sản phẩm web hoặc ứng dụng nghiệp vụ.', 'Thành thạo Figma, typography và thiết kế responsive.', 'Hiểu accessibility và biết kiểm chứng quyết định thiết kế.'],
    skills: ['Figma', 'UX Research', 'Design Systems', 'Prototyping', 'Accessibility'], project: 'Accessible design system for enterprise administration screens',
  },
  {
    key: 'mobile-flutter', title: 'Mobile Developer (Flutter)', location: 'Hybrid - Hà Nội', salary: '22 - 36 triệu VND',
    summary: 'Phát triển ứng dụng di động phục vụ ứng viên và người phỏng vấn, đồng bộ dữ liệu chính xác với nền tảng web.',
    responsibilities: ['Xây dựng màn hình Flutter và tích hợp API.', 'Quản lý state, bộ nhớ đệm và lỗi kết nối.', 'Kiểm thử trên thiết bị thật và hỗ trợ quy trình phát hành.'],
    requirements: ['Có kinh nghiệm Dart, Flutter và phát triển ứng dụng mobile.', 'Hiểu REST API, authentication và local storage.', 'Biết viết unit/widget test và xử lý vòng đời ứng dụng.'],
    skills: ['Flutter', 'Dart', 'REST API', 'State Management', 'Widget Testing'], project: 'Interview companion app with offline schedule caching',
  },
  {
    key: 'backend-intern', title: 'Backend Developer Intern', location: 'Hồ Chí Minh', salary: '5 - 8 triệu VND', closed: true,
    summary: 'Chương trình thực tập có mentor, tập trung kỹ năng phát triển API, làm việc nhóm và kiểm thử tính năng trước khi bàn giao.',
    responsibilities: ['Xây dựng API nhỏ dưới sự hướng dẫn của mentor.', 'Viết unit test, sửa lỗi và cập nhật tài liệu.', 'Tham gia daily meeting và review mã nguồn.'],
    requirements: ['Sinh viên năm cuối ngành CNTT hoặc tương đương.', 'Có kiến thức JavaScript, SQL và Git.', 'Có dự án cá nhân và cam kết thực tập tối thiểu3 tháng.'],
    skills: ['JavaScript', 'SQL', 'Git', 'REST API', 'Unit Testing'], project: 'Student booking API with database validation and automated tests',
  },
  {
    key: 'qa-manual', title: 'QA Engineer (Manual / API)', location: 'Hà Nội', salary: '15 - 24 triệu VND', closed: true,
    summary: 'Kiểm thử chức năng và dữ liệu của sản phẩm nghiệp vụ, ghi nhận lỗi có bước tái hiện rõ ràng và theo dõi tới khi được xử lý.',
    responsibilities: ['Lập checklist kiểm thử và quản lý test case.', 'Kiểm thử biểu mẫu, phân quyền, API và dữ liệu báo cáo.', 'Phối hợp với BA/Developer để xác nhận lỗi và kiểm hồi quy.'],
    requirements: ['Nắm vững kỹ thuật kiểm thử và quy trình báo cáo bug.', 'Biết Postman, SQL và đọc API contract.', 'Cẩn thận, giao tiếp tốt và có tư duy phân tích.'],
    skills: ['Postman', 'SQL', 'Test Design', 'Regression Testing', 'Bug Reporting'], project: 'API acceptance testing for an internal operations platform',
  },
];

const SURNAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ'];
const GIVEN_NAMES = ['Minh Anh', 'Quốc Huy', 'Thùy Linh', 'Gia Bảo', 'Ngọc Mai', 'Đức Long', 'Thanh Tâm', 'Khánh Vy', 'Trung Kiên', 'Bảo Ngân', 'Hải Nam', 'Phương Thảo', 'Tuấn Khang', 'Diệu Trang', 'Anh Duy', 'Hoài Phương', 'Minh Châu', 'Đình Phúc'];

export function demoCandidateName(index: number) {
  return `${SURNAMES[Math.floor(index / GIVEN_NAMES.length) % SURNAMES.length]} ${GIVEN_NAMES[index % GIVEN_NAMES.length]}`;
}

export function demoDescription(job: DemoJobSpec) {
  return `${job.summary}\n\nCông việc chính\n${job.responsibilities.map(s => '- ' + s).join('\n')}\n\nQuyền lợi\n- Bảo hiểm và ngày phép theo quy định; review năng lực định kỳ.\n- Ngân sách học tập, mentor và cơ hội tham gia dự án sản phẩm.\n- Môi trường làm việc tôn trọng phản hồi và chia sẻ kiến thức.\n\n${DEMO_MARKER} Dữ liệu minh họa tuyển dụng, không phải tin tuyển dụng thực tế.\n[TV2-SEED:${job.key}]`;
}
