"""Render node labels, positions and connections from actual n8n exports."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json, math

OUT = Path(__file__).resolve().parent
WORKFLOWS = OUT.parents[2] / 'workflows'
BG, INK, MUTED = '#F7F9FC', '#152238', '#52647C'
PALETTE = {'webhook':('#DCEBFF','#2674D9'),'code':('#EDE4FF','#7C4DCE'),
 'googleCalendar':('#DDF7E8','#1F9D55'),'emailSend':('#DDF7E8','#1F9D55'),
 'telegram':('#DDF7E8','#1F9D55'),'httpRequest':('#FFF0D7','#C87800'),
 'respondToWebhook':('#E7EEF5','#5F7187')}

def font(n=28,bold=False):
 return ImageFont.truetype('C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',n)

def wrap(d,text,f,width):
 lines=[]; line=''
 for word in text.split():
  trial=(line+' '+word).strip()
  if d.textlength(trial,font=f)>width and line: lines.append(line); line=word
  else: line=trial
 if line: lines.append(line)
 return lines

def arrow(d,a,b,color=MUTED):
 x1,y1=a; x2,y2=b; bend=max(60,abs(x2-x1)/2); pts=[]
 for i in range(41):
  t=i/40;u=1-t
  pts.append((u**3*x1+3*u*u*t*(x1+bend)+3*u*t*t*(x2-bend)+t**3*x2,u**3*y1+3*u*u*t*y1+3*u*t*t*y2+t**3*y2))
 d.line(pts,fill=color,width=5);p=pts[-2];ang=math.atan2(y2-p[1],x2-p[0]);L=17
 d.polygon([(x2,y2),(x2-L*math.cos(ang-.5),y2-L*math.sin(ang-.5)),(x2-L*math.cos(ang+.5),y2-L*math.sin(ang+.5))],fill=color)

NOTES={
 'Webhook: Xếp lịch phỏng vấn':'POST interview-schedule',
 'Validate delivery envelope':'ID · token · callback URL',
 'Claim interview delivery':'Nhận quyền xử lý đúng vòng',
 'Load interview payload':'Đọc snapshot chuẩn từ ATS',
 'Tự Động Tạo Lịch & Sinh Google Meet':'Google Calendar · event + Meet',
 'Read back Calendar event':'GET event vừa tạo',
 'Verify Calendar readback':'Xác minh giờ + conference + link',
 'Save Meet to ATS':'Callback CALENDAR_CONFIRMED',
 'Tạo Link Meet & Template Email':'Soạn HTML + format giờ VN',
 'Gửi Email Mời Ứng Viên':'SMTP → candidateEmail',
 'Verify SMTP acceptance':'messageId + đúng recipient',
 'Save email status to ATS':'Callback SMTP_ACCEPTED',
 'Respond HTTP 200':'Phản hồi webhook',
 'Calendar failure result':'FAILED / CALENDAR_ERROR',
 'Email failure result':'FAILED / SMTP_ERROR',
 'Save Calendar failure to ATS':'Callback báo lỗi Calendar',
 'Save email failure to ATS':'Callback báo lỗi email',
 'Webhook: 1-Click Hired':'POST employee-hired',
 'Soạn Thảo Welcome Package & HTML':'Soạn email + Telegram alert',
 'Gửi Welcome Package Email':'SMTP → email nhân viên',
 'Bắn Telegram IT & HR Ops':'Thông báo chuẩn bị nhận việc',
 'Bắn Tin Nhắn Telegram HR':'Thông báo HR về lịch mới'}

def render(filename,output,title,numbering=None,sx=1.75,sy=1.0):
 j=json.loads((WORKFLOWS/filename).read_text(encoding='utf-8-sig'))
 nodes=[n for n in j['nodes'] if not n['type'].endswith('stickyNote')]
 minx=min(n['position'][0] for n in nodes);miny=min(n['position'][1] for n in nodes)
 w,h=370,210
 pos={n['name']:(100+(n['position'][0]-minx)*sx,220+(n['position'][1]-miny)*sy) for n in nodes}
 W=int(max(x for x,y in pos.values())+w+100);H=int(max(y for x,y in pos.values())+h+160)
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 d.text((70,35),title,font=font(39,True),fill=INK)
 d.text((70,95),'Dựng từ JSON repo · tên node và connection thực tế · không phải ảnh chụp canvas n8n',font=font(24),fill=MUTED)
 for source,ports in j['connections'].items():
  if source not in pos:continue
  for branch,outputs in enumerate(ports.get('main',[])):
   for o in outputs:
    target=o['node']
    if target not in pos:continue
    x,y=pos[source];xx,yy=pos[target]
    arrow(d,(x+w,y+h/2+(40 if branch>0 else 0)),(xx,yy+h/2),'#C2394B' if branch>0 else MUTED)
 for i,n in enumerate(nodes):
  x,y=pos[n['name']];typ=n['type'].split('.')[-1];fill,edge=PALETTE.get(typ,('#E7EEF5','#5F7187'))
  if 'failure result' in n['name']:fill,edge='#FFE1E3','#C2394B'
  d.rounded_rectangle((x,y,x+w,y+h),radius=22,fill=fill,outline=edge,width=3)
  num=(numbering or {}).get(n['name'],str(i+1));d.ellipse((x-21,y-21,x+21,y+21),fill=edge)
  bb=d.textbbox((0,0),str(num),font=font(25,True));d.text((x-(bb[2]-bb[0])/2,y-18),str(num),font=font(25,True),fill='white')
  yy=y+17
  for line in wrap(d,n['name'],font(29,True),w-36):d.text((x+18,yy),line,font=font(29,True),fill=INK);yy+=37
  yy=max(yy+12,y+123)
  for line in wrap(d,NOTES.get(n['name'],typ),font(23),w-36):d.text((x+18,yy),line,font=font(23),fill=MUTED);yy+=29
 d.text((70,H-90),'Xanh: dịch vụ ngoài | Tím: Code | Cam: HTTP Request về backend | Đường đỏ: error output',font=font(24),fill=MUTED)
 im.save(OUT/output);return im,pos

def crop_phase(im,pos,names,title,output):
 x=min(pos[n][0] for n in names)-27;y=min(pos[n][1] for n in names)-40
 x2=max(pos[n][0] for n in names)+397;y2=max(pos[n][1] for n in names)+245
 part=im.crop((int(x),int(y),int(x2),int(y2)));out=Image.new('RGB',(part.width,part.height+140),BG)
 out.paste(part,(0,140));d=ImageDraw.Draw(out)
 d.text((35,25),title,font=font(38,True),fill=INK)
 d.text((35,80),'Số node tương ứng sơ đồ đầy đủ; đường đi ra ngoài vùng ảnh tiếp tục sang chặng khác.',font=font(22),fill=MUTED)
 out.save(OUT/output)

if __name__=='__main__':
 order=['Webhook: Xếp lịch phỏng vấn','Validate delivery envelope','Claim interview delivery','Load interview payload','Tự Động Tạo Lịch & Sinh Google Meet','Read back Calendar event','Verify Calendar readback','Save Meet to ATS','Tạo Link Meet & Template Email','Gửi Email Mời Ứng Viên','Verify SMTP acceptance','Save email status to ATS','Respond HTTP 200']
 numbering={n:str(i+1) for i,n in enumerate(order)}
 errors=['Calendar failure result','Save Calendar failure to ATS','Email failure result','Save email failure to ATS']
 numbering.update({n:c for n,c in zip(errors,['A','B','C','D'])})
 im,pos=render('interview-schedule-readback.json','tv2-n8n-interview-readback.png','TV2 · Xếp lịch + Meet + Email + readback về ATS',numbering)
 crop_phase(im,pos,order[:4],'Chặng 1 · Nhận yêu cầu và claim vòng','tv2-n8n-readback-1.png')
 crop_phase(im,pos,order[4:8],'Chặng 2 · Tạo / đọc / xác minh / lưu Google Meet','tv2-n8n-readback-2.png')
 crop_phase(im,pos,order[8:],'Chặng 3 · Soạn / gửi / xác minh / lưu thư mời','tv2-n8n-readback-3.png')
 crop_phase(im,pos,errors,'Nhánh lỗi · Ghi mã lỗi về ATS','tv2-n8n-readback-errors.png')
 render('employee-hired.json','tv2-n8n-employee-hired.png','TV2 · Employee Hired — gửi thư chào mừng',sx=2.05,sy=1.60)
 render('interview-schedule.json','tv2-n8n-interview-template.png','TV2 · Xếp lịch bản mẫu — Email / Telegram',sx=1.85,sy=1.30)
 print('Rendered source diagrams and phase details.')
