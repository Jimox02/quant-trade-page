'use strict';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const fmt=(v,d=2)=>v==null?'—':Number(v).toLocaleString('zh-CN',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=v=>v==null?'—':(v*100).toFixed(2)+'%',signed=v=>v==null?'—':(v>0?'+':'')+fmt(v),tone=v=>v>0?'up':v<0?'down':'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=name=>`<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const localTime=v=>v?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'—';
const statusName={ACTIVE:'日线模拟',EXPLORATORY_ACTIVE:'探索性模拟',FROZEN:'已冻结'},orderStatus={FILLED:'全部成交',REJECTED:'拒单',CANCELLED_REMAINDER:'余量已撤销',PARTIALLY_FILLED:'部分成交',NEW:'待执行'};
const reasonName={PRIOR_VOLUME_CAPACITY:'事前成交容量限制',CASH_AFFORDABILITY:'现金约束',PARTIAL_LIQUIDITY_OR_CASH:'容量或现金不足',CONSERVATIVE_LIMIT_TOUCH:'触及涨跌停，保守拒单',NO_DAILY_QUOTE:'缺少当日报价',LIMIT_EVIDENCE_MISSING:'缺少限价证据',ST_RESTRICTED:'ST限制',SUSPENSION_EVENT:'停复牌事件',INSUFFICIENT_CASH_OR_LOT_SIZE:'资金或交易单位不足',T_PLUS_ONE_OR_LOT_SIZE:'T+1或交易单位限制'};
let payload,selectedId='',selectedDay='',activeTab='持仓',range=0,metric='equity';
function clock(){const now=new Date();$('clock').textContent=now.toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});$('footer-date').textContent=now.toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'})+' · QUANT V3 / CLOUD RESEARCH TERMINAL'}clock();setInterval(clock,1000);
const account=()=>payload.accounts.find(a=>a.account_id===selectedId),sessions=()=>account().sessions||[];
const chosen=()=>sessions().find(s=>s.date===selectedDay)||sessions().at(-1);
function drawAccounts(){
 $('account-count').textContent=String(payload.accounts.length).padStart(2,'0');
 $('accounts').innerHTML=payload.accounts.map((a,i)=>`<button class="account" role="radio" aria-checked="${a.account_id===selectedId}" data-id="${esc(a.account_id)}"><span class="account-top">${icon(['chart','pulse','shield','arrow','bars'][i%5])}<span class="account-number">${String(i+1).padStart(2,'0')} / ${String(payload.accounts.length).padStart(2,'0')}</span></span><strong>${esc(a.name)}</strong><small>${esc(a.model_name)}</small><span class="account-bottom"><span>${a.sessions.length} 日已结算</span><span class="account-state ${a.status==='FROZEN'?'pending':''}"><span class="status-dot"></span>${statusName[a.status]||'状态待确认'}</span></span></button>`).join('');
 $('accounts').querySelectorAll('button').forEach(b=>b.onclick=()=>{selectedId=b.dataset.id;selectedDay='';drawAccounts();render()});
}
function render(){
 const a=account(),s=chosen(),history=s?sessions().filter(x=>x.date<=s.date):[],last=history.at(-1),maxdd=history.length?Math.min(0,...history.map(x=>x.drawdown)):null;
 const pending=a.next_plan,blocked=a.run_status==='BLOCKED';
 const banner=blocked?'最近云端任务被阻断，以下仅展示已提交的历史记录。':!s?(pending?`下一交易日 ${pending.target_date} · ${pending.orders} 笔事前计划订单已归档，等待行情到达后验证执行。`:'尚无已提交结算，等待有效的事前信号与市场数据。'):a.status==='EXPLORATORY_ACTIVE'?'探索性模拟 · 每5个交易日调仓，尚未通过收益有效性验证。':'';
 const kpi=(label,value,foot,i,cls='')=>`<div class="kpi"><span class="kpi-label">${label}${icon(i)}</span><strong class="value ${cls}">${value}</strong><span class="kpi-foot">${foot}</span></div>`;
 $('account-detail').innerHTML=`<div class="ledger-heading"><div><h2>${esc(a.name)}</h2><p>${esc(a.model_name)} / A股现货 / 独立模拟账本</p></div><span class="selected-status"><span class="status-dot"></span>${blocked?'任务阻断':a.status==='FROZEN'?'账户冻结':s?'已提交结算':'等待首次执行'}</span></div>${banner?`<div class="banner ${blocked?'warn':''}">${icon(blocked?'shield':'clock')}<span>${esc(banner)}</span></div>`:''}
 <div class="kpis">${kpi(s?'收盘净资产 / CNY':'初始模拟资金 / CNY',fmt(s?s.equity:a.initial_cash),s?'现金 ¥'+fmt(s.cash):'初始化资金，尚无交易收益','wallet')}${kpi('累计净收益',s?pct(s.total_return):'—',s?'较初始资金 '+signed(s.equity-a.initial_cash)+' 元':'首个有效结算后计算','chart',tone(s?.total_return))}${kpi('当日净盈亏',s?signed(s.day_pnl):'—',s?'当日收益率 '+pct(s.day_return):'没有成交或净值观测','pulse',tone(s?.day_pnl))}${kpi('当日交易成本',s?fmt(s.costs):'—',s?`${s.orders.length} 条订单 · ${s.fills.length} 笔模拟成交`:'佣金 / 印花税 / 过户费 / 滑点','fee')}</div>
 <div class="stat-strip"><span>已结算<strong>${history.length} 日</strong></span><span>观测最大回撤<strong>${pct(maxdd)}</strong></span><span>累计成本<strong>${last?'¥'+fmt(last.cumulative_costs):'—'}</strong></span><span>初始资金<strong>¥${fmt(a.initial_cash,0)}</strong></span><span class="spacer">${icon('clock')}统计截至 ${s?s.date:'尚无结算'}</span></div>
 <section id="performance" class="charts" aria-label="账户表现图表"><div class="panel"><div class="panel-head"><div><span class="eyebrow">PORTFOLIO PERFORMANCE</span><h3>${icon('chart')}<span>${metric==='equity'?'净资产走势':'累计净收益'}</span></h3></div><div class="segments" aria-label="图表时间范围">${[[0,'全部'],[20,'20日'],[60,'60日']].map(([n,t])=>`<button data-range="${n}" aria-pressed="${range===n}">${t}</button>`).join('')}</div></div><div id="nav-chart"></div><div class="chart-note"><span><i class="legend-dot"></i>仅展示已提交结算的观测点</span><button id="metric-toggle" class="ghost chart-toggle">切换为${metric==='equity'?'累计收益':'净资产'}</button></div></div>
 <div class="panel"><div class="panel-head"><div><span class="eyebrow">DAILY NET P&amp;L</span><h3>${icon('bars')}每日净盈亏</h3></div><span class="eyebrow">CNY</span></div><div id="pnl-chart"></div><div class="chart-note"><span>已计入账本交易成本</span><span><i class="legend-dot" style="background:var(--red)"></i>盈利 <i class="legend-dot" style="background:var(--green)"></i>亏损</span></div></div></section>
 <section class="subcharts" aria-label="风险与配置"><div class="panel"><div class="panel-head"><div><span class="eyebrow">ASSET ALLOCATION</span><h3>${icon('pie')}持仓与现金配置</h3></div><span class="eyebrow">${s?s.date:'等待结算'}</span></div><div id="allocation"></div></div><div class="panel"><div class="panel-head"><div><span class="eyebrow">DOWNSIDE MONITOR</span><h3>${icon('shield')}观测回撤</h3></div><span class="eyebrow">${pct(maxdd)}</span></div><div id="drawdown-chart"></div></div></section>
 <section class="panel table-panel" id="ledger"><div class="table-heading"><h2>${icon('orders')}交易账本</h2><div class="table-controls"><label for="trade-date">结算日期</label><select id="trade-date" ${s?'':'disabled'}>${s?sessions().slice().reverse().map(x=>`<option ${x.date===s.date?'selected':''}>${x.date}</option>`).join(''):'<option>暂无结算</option>'}</select></div></div><div class="tabs" role="tablist" aria-label="交易详情分类">${[['持仓','layers'],['订单','orders'],['成交','trade'],['费用流水','fee'],['每日结算','clock']].map(([t,i])=>`<button role="tab" aria-selected="${t===activeTab}" data-tab="${t}">${icon(i)}${t}</button>`).join('')}</div><div class="table-wrap" id="table" role="tabpanel" aria-label="${activeTab}"></div><div class="table-footer"><span>只读账本 · 页面操作不触发下单或结算</span><span id="record-count"></span></div></section>`;
 $('trade-date').onchange=e=>{selectedDay=e.target.value;render()};
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===b));$('table').setAttribute('aria-label',activeTab);renderTable()});
 document.querySelectorAll('[data-range]').forEach(b=>b.onclick=()=>{range=Number(b.dataset.range);render()});
 $('metric-toggle').onclick=()=>{metric=metric==='equity'?'total_return':'equity';render()};
 renderCharts(history);renderTable();
}
function node(parent,tag,attrs={},text){const n=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));if(text!==undefined)n.textContent=text;parent.append(n);return n}
function empty(id,short=false){$(id).innerHTML=`<div class="empty-chart">${icon('chart')}<span>暂无已结算数据</span>${short?'':'<small>不使用计划订单生成收益曲线</small>'}</div>`}
function svg(id,w,h,label){$(id).replaceChildren();return node($(id),'svg',{viewBox:`0 0 ${w} ${h}`,class:'chart',role:'img','aria-label':label})}
function lineChart(id,rows,key,color,short=false){
 if(!rows.length){empty(id,short);return}
 const w=800,h=short?150:260,left=key==='equity'?83:60,right=23,top=18,bottom=short?30:38,chart=svg(id,w,h,key==='drawdown'?'已结算观测回撤':key==='equity'?'已结算净资产走势':'已结算累计净收益');
 const values=rows.map(s=>s[key]),rawlo=Math.min(...values),rawhi=Math.max(...values),pad=Math.max((rawhi-rawlo)*.22,key==='equity'?Math.abs(rawlo)*.001:.001),lo=key==='drawdown'?Math.min(rawlo-pad,-.001):rawlo-pad,hi=key==='drawdown'?0:rawhi+pad,span=hi-lo;
 const y=v=>top+(hi-v)/span*(h-top-bottom),x=i=>rows.length===1?(left+w-right)/2:left+i*(w-left-right)/(rows.length-1);
 for(let i=0;i<(short?3:4);i++){const v=hi-i*span/(short?2:3),yy=y(v);node(chart,'line',{x1:left,y1:yy,x2:w-right,y2:yy,stroke:'#252d30','stroke-dasharray':'3 5'});node(chart,'text',{x:left-12,y:yy+4,fill:'#91a0a5','text-anchor':'end','font-size':short?10:11},key==='equity'?fmt(v,0):pct(v))}
 const points=values.map((v,i)=>[x(i),y(v)]),defs=node(chart,'defs'),gradient=node(defs,'linearGradient',{id:id+'-gradient',x1:'0%',y1:'0%',x2:'0%',y2:'100%'});node(gradient,'stop',{offset:'0%','stop-color':color,'stop-opacity':'.19'});node(gradient,'stop',{offset:'100%','stop-color':color,'stop-opacity':'0'});
 if(points.length>1){node(chart,'polygon',{points:[[points[0][0],h-bottom],...points,[points.at(-1)[0],h-bottom]].map(p=>p.join(',')).join(' '),fill:`url(#${id}-gradient)`});node(chart,'polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:color,'stroke-width':2})}
 points.forEach(([xx,yy],i)=>{const circle=node(chart,'circle',{cx:xx,cy:yy,r:rows.length<15?4:2,fill:color,stroke:'#111416','stroke-width':2});node(circle,'title',{},`${rows[i].date} ${key==='equity'?fmt(values[i]):pct(values[i])}`)});
 [...new Set([0,Math.floor((rows.length-1)/2),rows.length-1])].forEach(i=>node(chart,'text',{x:x(i),y:h-12,fill:'#91a0a5','text-anchor':i===0&&rows.length>1?'start':i===rows.length-1&&rows.length>1?'end':'middle','font-size':10},rows[i].date));
}
function renderCharts(history){
 const rows=range?history.slice(-range):history;lineChart('nav-chart',rows,metric,'#c5f477');lineChart('drawdown-chart',rows,'drawdown','#aa9be9',true);
 if(!rows.length)empty('pnl-chart');else{
  const c=svg('pnl-chart',600,260,'已结算每日净盈亏'),base=120,scale=Math.max(1,...rows.map(s=>Math.abs(s.day_pnl))),barWidth=Math.min(48,390/rows.length);
  for(const i of [-1,0,1]){const yy=base-i*78;node(c,'line',{x1:70,y1:yy,x2:578,y2:yy,stroke:i?'#252d30':'#47524f','stroke-dasharray':i?'3 5':''});node(c,'text',{x:58,y:yy+4,fill:'#91a0a5','text-anchor':'end','font-size':10},fmt(scale*i,0))}
  rows.forEach((s,i)=>{const xx=rows.length===1?325:95+i*455/(rows.length-1),height=Math.abs(s.day_pnl)/scale*78;const bar=node(c,'rect',{x:xx-barWidth/2,y:s.day_pnl>=0?base-height:base,width:barWidth,height:Math.max(height,1),rx:3,fill:s.day_pnl>=0?'#f28b86':'#6dccac'});node(bar,'title',{},`${s.date} ${signed(s.day_pnl)} 元`);if(rows.length<=7){node(c,'text',{x:xx,y:s.day_pnl>=0?base-height-10:base+height+16,fill:s.day_pnl>=0?'#f28b86':'#6dccac','text-anchor':'middle','font-size':11},signed(s.day_pnl));node(c,'text',{x:xx,y:243,fill:'#91a0a5','text-anchor':'middle','font-size':10},s.date.slice(5))}});
 }
 const s=chosen();if(!s){empty('allocation',true);return}
 const colors=['#c5f477','#74cdd4','#aa9be9','#d6aa71','#6da8a1','#9fba73','#c9b9e9','#b88874','#738fbd','#c7ce9e','#8daca3'];
 const holdings=s.holdings||[],complete=holdings.every(h=>h.market_value!=null);
 const items=complete?holdings.map((h,i)=>({name:payload.stock_names[h.symbol]||h.symbol,value:h.market_value,color:colors[i%colors.length]})):[{name:'持仓市值合计',value:s.market_value,color:colors[0]}];items.push({name:'现金',value:s.cash,color:'#516459'});
 $('allocation').innerHTML=`<div class="allocation"><div class="allocation-track" aria-label="持仓与现金市值占比">${items.map(i=>`<span style="flex:${Math.max(0,i.value)};background:${i.color}" title="${esc(i.name)} ${pct(i.value/s.equity)}"></span>`).join('')}</div><div class="allocation-legend">${items.map(i=>`<span><i style="background:${i.color}"></i>${esc(i.name)}<b>${pct(i.value/s.equity)}</b></span>`).join('')}</div>${!complete?'<p class="muted" style="font-size:9px">个股估值证据缺失，仅展示账本持仓总市值。</p>':''}</div>`;
}
function renderTable(){
 const s=chosen();let columns=[],rows=[];
 const stock=r=>{const code=r.symbol||r.ts_code||'—';return `<strong>${esc(payload.stock_names[code]||code)}</strong><span class="stock-code">${esc(code)}</span>`};
 const side=r=>`<span class="pill ${r.side==='SELL'?'sell':''}">${r.side==='BUY'?'买入':r.side==='SELL'?'卖出':esc(r.side)}</span>`;
 if(activeTab==='每日结算'){columns=['结算日期','收盘净资产','现金','当日净盈亏','累计净收益','交易成本','成交笔数'];rows=sessions().slice().reverse().map(r=>[esc(r.date),fmt(r.equity),fmt(r.cash),`<span class="${tone(r.day_pnl)}">${signed(r.day_pnl)}</span>`,pct(r.total_return),fmt(r.costs),r.fills.length])}
 else if(s&&activeTab==='持仓'){columns=['证券','股数','平均成本（含费用）','当日收盘','市值','持仓权重','当日可卖'];rows=(s.holdings||[]).map(r=>[stock(r),fmt(r.quantity,0),fmt(r.average_cost),fmt(r.close),fmt(r.market_value),pct(r.weight),fmt(r.sellable_quantity,0)])}
 else if(s&&activeTab==='订单'){columns=['证券','方向','委托股数','成交股数','未成交股数','订单状态','原因'];rows=s.orders.map(r=>[stock(r),side(r),fmt(r.quantity,0),fmt(r.filled,0),r.filled==null?'—':fmt(r.quantity-r.filled,0),esc(orderStatus[r.status]||r.status),esc(reasonName[r.reason]||r.reason||'—')])}
 else if(s&&activeTab==='成交'){columns=['证券','方向','成交股数','模拟价格','成交金额','佣金','印花税','过户费','滑点成本','总成本'];rows=s.fills.map(r=>[stock(r),side(r),fmt(r.quantity,0),fmt(r.price),fmt(r.notional),fmt(r.commission),fmt(r.stamp_tax),fmt(r.transfer_fee),fmt(r.slippage),fmt(r.cost)])}
 else if(s&&activeTab==='费用流水'){columns=['记录时间（北京时间）','资金类型','现金变动','变动后余额'];rows=(s.ledger||[]).map(r=>[esc(localTime(r.timestamp)),esc(r.kind==='BUY'?'买入支出':r.kind==='SELL'?'卖出收入':r.kind),signed(r.amount),fmt(r.balance)])}
 $('table').innerHTML=rows.length?`<table><thead><tr>${columns.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<div class="empty-table">${icon('orders')}<span>${s?'本日暂无'+esc(activeTab)+'记录':'等待首个有效模拟结算'}</span><small>${s?'未成交请查看订单状态与原因。':'事前计划不计入成交与收益。'}</small></div>`;
 $('record-count').textContent=rows.length+' 条记录'+(s?' · '+s.date:'');
}
async function load(){
 const button=$('refresh');button.disabled=true;
 try{const response=await fetch('./results.json',{cache:'no-store'});if(!response.ok)throw Error('结果文件暂不可用，请稍后刷新');const data=await response.json();if(!Array.isArray(data.accounts)||!data.accounts.length)throw Error('账户数据格式不匹配，请刷新页面');payload=data;if(!payload.accounts.some(a=>a.account_id===selectedId))selectedId=payload.default_account_id||payload.accounts[0].account_id;
 $('updated').textContent=localTime(data.generated_at);$('error').textContent=data.status==='PASS'?'':'最近云端任务未成功，以下保留已提交历史结果，不代表今日已结算。';drawAccounts();render();
 }catch(e){$('error').textContent='读取失败：'+e.message;if(!payload)$('account-detail').innerHTML='<div class="empty-table">暂时无法读取模拟账本，请点击刷新数据。</div>'}finally{button.disabled=false}
}
$('refresh').onclick=load;load();
