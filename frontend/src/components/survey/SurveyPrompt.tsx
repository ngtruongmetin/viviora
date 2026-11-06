import { useQuery } from '@tanstack/react-query';
import { ClipboardList, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { surveysApi } from '../../services/domain/surveys';
export function SurveyPrompt(){const {user}=useAuth();const [closed,setClosed]=useState(false);const q=useQuery({queryKey:['survey-status',user?.id],queryFn:()=>surveysApi.status().then(r=>r.data.data),enabled:!!user&&user.role==='STUDENT'});if(closed||!q.data?.eligible||q.data.completed||!q.data.survey)return null;return <div className="survey-prompt" role="dialog"><button title="Để sau" className="icon-button" onClick={()=>setClosed(true)}><X size={18}/></button><ClipboardList size={26}/><div><strong>KHẢO SÁT SAU SỬ DỤNG</strong><p>Chia sẻ ý kiến của em về Viviora. Mất khoảng 5-7 phút.</p><Link className="button primary" to="/khao-sat">THAM GIA</Link></div></div>}
