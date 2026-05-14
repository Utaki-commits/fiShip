import type { CSSProperties } from 'react'

export default function PrivacyPage() {
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
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: '10px' }}>プライバシーポリシー</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>個人情報の取り扱いについて</p>
      </div>

      <div style={{ padding: '40px 24px 80px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--ocean-light)', borderRadius: '12px', padding: '20px 24px', marginBottom: '36px', fontSize: '15px', color: 'var(--fg-2)', lineHeight: 1.8 }}>
          UTAKI SYSTEM（以下「当社」）は、遊漁船予約管理サービス「FiShip」（以下「本サービス」）における個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。本サービスをご利用いただく前に、必ずお読みください。
        </div>

        <Section title="第1条　収集する個人情報" items={['氏名（お名前）','電話番号','住所','緊急連絡先（氏名・電話番号・続柄）','LINEユーザー情報（LINEログインを利用した場合：表示名・プロフィール画像・LINEユーザーID）','Instagramユーザー情報（Instagram連携を利用した場合：表示名・プロフィール画像・InstagramユーザーID）','予約内容（乗船希望日・人数・釣り方・メッセージ等）','本サービスの利用履歴・操作ログ']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} liStyle={liStyle} lead="本サービスでは、以下の個人情報を収集します。" />
        <Section title="第2条　個人情報の利用目的" items={['遊漁船の予約受付・管理・確認のご連絡','乗船名簿の作成・管理','サービスの運営・改善・新機能の開発','法令に基づく対応']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} liStyle={liStyle} lead="収集した個人情報は、以下の目的にのみ使用します。" />

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第3条　個人情報の第三者提供</h2>
          <p style={pStyle}>当社は、以下の場合を除き、収集した個人情報を第三者に提供しません。</p>
          <List items={['ご本人の同意がある場合','法令に基づく場合（警察・裁判所等の公的機関からの要請）','人の生命・身体・財産の保護のために必要な場合']} liStyle={liStyle} />
          <div style={highlightStyle}>※ 乗船客の予約情報（氏名・電話番号・予約内容）は、予約された遊漁船の船長に提供されます。これはサービスの性質上必要な情報共有であり、第三者提供には該当しません。</div>
        </div>

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第4条　個人情報の管理・保管</h2>
          <p style={pStyle}>当社は、個人情報の漏洩・滅失・毀損を防止するために、適切なセキュリティ対策を実施します。</p>
          <List items={['データはSupabase（米国）のサーバーに暗号化して保管されます','通信にはSSL/TLS暗号化を使用します','アクセス権限を必要最小限に制限します']} liStyle={liStyle} />
          <p style={pStyle}>サービス解約後のデータ保管については、以下のとおりとします。</p>
          <List items={['予約データ・乗船名簿：解約後6ヶ月間保持した後、削除','顧客（乗船客）データ：運営者が適切な期間保持']} liStyle={liStyle} />
        </div>

        <TextSection title="第5条　Cookieおよびアクセス解析" paragraphs={['本サービスでは、ユーザー認証およびサービス品質向上のためにCookieを使用することがあります。ブラウザの設定によりCookieを無効にすることができますが、一部の機能が使用できなくなる場合があります。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <Section title="第6条　外部サービスとの連携" items={['LINEログイン（LINEヤフー株式会社）','Instagram / Facebook（Meta Platforms, Inc.）','Auth0（Okta, Inc.）','Supabase（Supabase Inc.）','Vercel（Vercel Inc.）','Stripe（Stripe, Inc.）※決済処理']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} liStyle={liStyle} lead="本サービスは、以下の外部サービスと連携しています。各サービスのプライバシーポリシーもご確認ください。" />
        <TextSection title="第7条　個人情報の開示・訂正・削除" paragraphs={['ご本人から個人情報の開示・訂正・削除・利用停止のご請求があった場合、本人確認のうえ、合理的な期間内に対応します。','ご請求は下記のお問い合わせ先までご連絡ください。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第8条　未成年者の個人情報" paragraphs={['本サービスは主に成人を対象としています。未成年者が本サービスをご利用になる場合は、保護者の同意を得たうえでご利用ください。','親子での乗船など、未成年者が乗船される場合は、保護者が代理で予約を行い、未成年者の個人情報（氏名・緊急連絡先等）を入力することがあります。この場合、保護者の同意のもと情報を収集・管理します。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />
        <TextSection title="第9条　プライバシーポリシーの変更" paragraphs={['当社は、法令の改正やサービス内容の変更に伴い、本ポリシーを改定することがあります。重要な変更が生じた場合は、本サービス内にて通知します。改定後も本サービスをご利用いただいた場合、改定後のポリシーに同意したものとみなします。']} sectionStyle={sectionStyle} titleStyle={titleStyle} pStyle={pStyle} />

        <div style={sectionStyle}>
          <h2 style={titleStyle}>第10条　海外からのご利用について</h2>
          <p style={pStyle}>本サービスおよび本ポリシーは日本語のみで提供されます。日本語以外の言語による内容の解釈については、日本語版を正とします。</p>
          <p style={pStyle}>海外からご予約される場合も、本サービスをご利用いただいた時点で本ポリシーに同意いただいたものとみなします。</p>
          <p style={pStyle}>なお、予約フォームへの入力は日本語または英語で行ってください。国際電話番号（例：+1-XXX-XXXX-XXXX）での入力にも対応しています。</p>
          <div style={highlightStyle}>※ 本サービスは日本語のみの提供となっております。</div>
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
