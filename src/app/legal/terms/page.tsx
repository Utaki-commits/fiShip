import type { CSSProperties } from 'react'

export default function TermsPage() {
  const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', marginBottom: '20px' } as const
  const titleStyle = { fontSize: '18px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--border)' } as const
  const pStyle = { fontSize: '15px', color: 'var(--fg-2)', marginBottom: '12px', lineHeight: 1.8 } as const
  const liStyle = { fontSize: '15px', color: 'var(--fg-2)', padding: '8px 0 8px 16px', borderBottom: '1px solid var(--border)', lineHeight: 1.7, listStyle: 'none', position: 'relative' as const }
  const highlightStyle = { background: 'var(--ocean-pale)', border: '1px solid var(--ocean-light)', borderRadius: '10px', padding: '14px 16px', margin: '12px 0', fontSize: '14px', color: 'var(--fg-2)', lineHeight: 1.7 } as const

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ background: 'linear-gradient(135deg, var(--ocean) 0%, #0F4570 60%, #04192B 100%)', padding: '48px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '40px', background: 'var(--bg)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <img src={DEFAULT_ICON} alt="FiShip" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>FiShip</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: '10px' }}>利用規約</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>FiShipをご利用いただく際のルール</p>
      </div>

      <div style={{ padding: '40px 24px 80px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--ocean-light)', borderRadius: '12px', padding: '20px 24px', marginBottom: '36px', fontSize: '15px', color: 'var(--fg-2)', lineHeight: 1.8 }}>
          本利用規約は、UTAKI SYSTEM（以下「当社」）が提供する遊漁船予約管理サービス「FiShip」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただく前に、必ずお読みください。
        </div>

        <TextSection title="第1条　サービスの内容" paragraphs={['本サービスは、遊漁船の船長または事業者が予約受付、予約管理、顧客管理、乗船名簿作成、釣行スケジュール管理等を行うための予約管理サービスです。','本サービスは、船長と乗船客との連絡や予約管理を補助するものであり、釣行の安全、出船可否、釣果、天候等を保証するものではありません。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第2条　利用登録</h2>
          <p style={pStyle}>本サービスの利用登録は、LINEログインまたは電話番号認証により行います。</p>
          <List liStyle={liStyle} items={['1つのアカウントで登録できる遊漁船は原則1隻までとします。','複数の船で同一アカウントを使い回す行為、または当社が不適切と判断する利用が確認された場合、アカウントを停止することがあります。','虚偽の情報、第三者になりすました情報、実在しない船舶情報で登録した場合、アカウントを停止することがあります。','アカウント停止または登録取消となった場合でも、既に支払われた利用料金は返金されません。']} />
        </div>

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第3条　料金・支払い</h2>
          <p style={pStyle}>本サービスの基本料金は、1アカウントあたり月額980円（税込）です。</p>
          <List liStyle={liStyle} items={['初回登録日から30日間は無料で利用できます。','無料期間終了後、登録された支払い方法により自動的に課金されます。','支払い方法は、クレジットカード、デビットカード、Apple Pay、Google Payに対応します。','今後、銀行振込、コンビニ決済その他の支払い方法を追加する場合があります。']} />
          <div style={highlightStyle}>料金、無料期間、支払い方法の詳細は、本サービス内の案内または決済画面に表示される内容を優先します。</div>
        </div>

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第4条　解約・退会</h2>
          <List liStyle={liStyle} items={['利用者は、アカウント設定画面からいつでも解約手続きを行うことができます。','解約後も、支払い済み期間の終了日までは本サービスを利用できます。','解約後、予約データおよび乗船名簿は6ヶ月間保持した後、削除されます。','顧客データは、法令対応およびサービス運営上必要な範囲で、運営者が適切な期間保持します。','月途中で解約した場合でも、日割り返金その他の返金は行いません。']} />
        </div>

        <Section title="第5条　禁止事項" lead="利用者は、本サービスの利用にあたり、以下の行為をしてはなりません。" items={['法令または公序良俗に反する行為','虚偽の情報を登録する行為','第三者の個人情報を不正に取得、利用、登録する行為','本サービスを不正アクセス、スパム、迷惑行為に利用する行為','当社または第三者の権利、信用、利益を侵害する行為','本サービスの運営を妨害する行為','その他、当社が不適切と判断する行為']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} liStyle={liStyle} />
        <TextSection title="第6条　サービスの変更・停止" paragraphs={['当社は、利用者への事前通知なく、本サービスの内容を変更、追加、停止または終了することがあります。','システム保守、障害、外部サービスの停止、災害その他やむを得ない事情により、本サービスの全部または一部を一時停止することがあります。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第7条　免責事項" paragraphs={['当社は、本サービスに事実上または法律上の瑕疵がないこと、完全性、正確性、有用性、継続性を保証しません。','本サービスの利用により利用者または第三者に生じた損害について、当社の故意または重過失による場合を除き、当社は責任を負いません。','釣行中の事故、天候判断、出船判断、乗船客とのトラブル、料金の回収、キャンセル対応等は、利用者である船長または事業者の責任において行うものとします。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第8条　知的財産権" paragraphs={['本サービスに関するプログラム、デザイン、ロゴ、文章、画像その他一切の知的財産権は、当社または正当な権利を有する第三者に帰属します。','利用者は、当社の許可なく本サービスの内容を複製、改変、転載、販売、再配布してはなりません。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第9条　規約の変更" paragraphs={['当社は、必要に応じて本規約を変更することがあります。重要な変更がある場合は、本サービス内で通知します。','変更後も本サービスを利用した場合、利用者は変更後の規約に同意したものとみなします。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第10条　準拠法・管轄裁判所" paragraphs={['本規約は日本法に準拠します。','本サービスに関して紛争が生じた場合、当社所在地を管轄する日本の裁判所を第一審の専属的合意管轄裁判所とします。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第11条　海外からのご利用</h2>
          <p style={pStyle}>本サービスは日本語のみで提供されます。日本語以外の言語による内容の解釈については、日本語版を正とします。</p>
          <p style={pStyle}>海外から予約される乗船客とのやりとりについても、原則として船長または事業者が日本語で対応するものとします。</p>
          <div style={highlightStyle}>※ 本サービスは日本国内の遊漁船事業者向けに設計されています。</div>
        </div>

        <History />
        <Contact />
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--fg-3)', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          制定日：2026年5月　／　UTAKI SYSTEM
        </p>
      </div>
    </div>
  )
}

function List({ items, liStyle }: { items: string[]; liStyle: CSSProperties }) {
  return <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>{items.map(item => <li key={item} style={liStyle}>{item}</li>)}</ul>
}

function Section({ title, lead, items, sectionStyle, titleStyle, pStyle, liStyle }: { title: string; lead: string; items: string[]; sectionStyle: CSSProperties; titleStyle: CSSProperties; pStyle: CSSProperties; liStyle: CSSProperties }) {
  return <div style={sectionStyle}><h2 style={titleStyle}>{title}</h2><p style={pStyle}>{lead}</p><List items={items} liStyle={liStyle} /></div>
}

function TextSection({ title, paragraphs, sectionStyle, titleStyle, pStyle }: { title: string; paragraphs: string[]; sectionStyle: CSSProperties; titleStyle: CSSProperties; pStyle: CSSProperties }) {
  return <div style={sectionStyle}><h2 style={titleStyle}>{title}</h2>{paragraphs.map(p => <p key={p} style={pStyle}>{p}</p>)}</div>
}

function History() {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px 28px', marginTop: '32px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid var(--border)' }}>改定履歴</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <tbody><tr><td style={td}>第1版</td><td style={td}>2026年5月</td><td style={td}>制定</td></tr></tbody>
      </table>
    </div>
  )
}

const td = { padding: '10px 14px', color: 'var(--fg-2)', borderBottom: '1px solid var(--border)' } as const

function Contact() {
  return (
    <div style={{ background: 'linear-gradient(135deg, var(--ocean) 0%, #0F4570 100%)', borderRadius: '14px', padding: '28px', marginTop: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: 'var(--gold)' }}>お問い合わせ先</h3>
      {[{ label: '屋号', value: 'UTAKI SYSTEM' }, { label: 'サービス名', value: 'FiShip' }, { label: 'メール', value: 'co.utaki@gmail.com' }, { label: 'URL', value: '[サービスURL] ※確定後更新' }].map(({ label, value }) => (
        <div key={label} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '15px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', minWidth: '80px' }}>{label}</span>
          <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  )
}
