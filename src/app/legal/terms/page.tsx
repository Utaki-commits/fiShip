export default function TermsPage() {
  const DEFAULT_ICON = 'https://whnpkellpiauxovxtpnz.supabase.co/storage/v1/object/public/vessel-images/Fiship_icon.png'

  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '28px', marginBottom: '20px' } as const
  const titleStyle = { fontSize: '18px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--border)' } as const
  const pStyle = { fontSize: '15px', color: 'var(--fg-2)', marginBottom: '12px', lineHeight: 1.8 } as const
  const liStyle = { fontSize: '15px', color: 'var(--fg-2)', padding: '8px 0 8px 16px', borderBottom: '1px solid var(--border)', lineHeight: 1.7, listStyle: 'none' as const }
  const warningStyle = { background: '#FFF8E6', border: '1px solid #F0CC6A', borderRadius: '10px', padding: '16px 18px', margin: '14px 0', fontSize: '14px', color: '#6B4D00', lineHeight: 1.7 } as const

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>

      {/* ヘッダー */}
      <div style={{ background: 'linear-gradient(135deg, #04192B 0%, #0F4570 60%, var(--ocean) 100%)', padding: '48px 24px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '40px', background: 'var(--bg)', borderRadius: '50% 50% 0 0 / 100% 100% 0 0' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <img src={DEFAULT_ICON} style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#fff' }}>FiShip</span>
        </div>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 900, color: '#fff', lineHeight: 1.3, marginBottom: '10px' }}>利用規約</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>サービスご利用にあたってのルール</p>
      </div>

      <div style={{ padding: '40px 24px 80px' }}>

        {/* イントロ */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--gold)', borderRadius: '12px', padding: '20px 24px', marginBottom: '36px', fontSize: '15px', color: 'var(--fg-2)', lineHeight: 1.8 }}>
          この利用規約（以下「本規約」）は、UTAKI SYSTEM（以下「当社」）が提供する遊漁船予約管理サービス「FiShip」（以下「本サービス」）の利用条件を定めるものです。本サービスをご利用いただく前に、必ずお読みください。本サービスをご利用いただいた時点で、本規約に同意いただいたものとみなします。
        </div>

        {/* 第1条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第1条　サービスの内容</h2>
          <p style={pStyle}>本サービスは、遊漁船の船長（以下「船長会員」）向けに、予約管理・乗船名簿管理・顧客管理等の機能を提供するインターネット上のサービス（SaaS）です。</p>
          <p style={pStyle}>また、乗船客（以下「利用者」）向けに、遊漁船への予約申し込み機能を提供します。</p>
          <div style={warningStyle}>※ SaaS（サース）とは、インターネットを通じてご利用いただくソフトウェアサービスのことです。アプリのインストールは不要で、スマートフォンやパソコンのブラウザからご利用いただけます。</div>
        </div>

        {/* 第2条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第2条　利用登録</h2>
          <p style={pStyle}>本サービスの船長会員としての利用には、LINEアカウントまたは電話番号による認証が必要です。登録にあたり、正確な情報を入力してください。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '1つのアカウント（LINEまたは電話番号）につき、登録できる船は1隻とします。複数の船での使い回しが判明した場合、アカウントを停止または削除することがあります',
              '虚偽の情報での登録は禁止します',
              '登録情報に変更があった場合は、速やかに更新してください',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
          <div style={warningStyle}>⚠️ 虚偽の情報による登録が判明した場合、当社は事前通知なくアカウントを停止または削除することがあります。この場合、既にお支払いいただいた料金の返金はいたしません。</div>
        </div>

        {/* 第3条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第3条　料金・支払い</h2>
          <p style={pStyle}>本サービスの利用料金は以下のとおりです。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '月額料金：980円（税込）',
              '無料期間：初回登録日から30日間',
              '無料期間終了後は、自動的に月額課金が開始されます',
              '支払い方法はクレジットカード・デビットカード・Apple Pay・Google Payに対応しています',
              '対応する支払い方法は今後追加される場合があります',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
          <div style={warningStyle}>⚠️ 解約後も、お支払い済みの期間（登録日から30日間）はサービスをご利用いただけます。ただし、料金の返金はいたしません。残り期間があっても日割り返金は行いません。</div>
        </div>

        {/* 第4条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第4条　解約・退会</h2>
          <p style={pStyle}>船長会員は、いつでもアプリ内の設定画面から解約手続きを行うことができます。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '解約後、お支払い済み期間の終了日までサービスをご利用いただけます',
              '解約後6ヶ月以内に再登録した場合、以前のデータを復元できます',
              '解約後6ヶ月を経過した場合、船の情報・予約データ・乗船名簿は削除されます',
              '顧客（乗船客）データは、当社が別途適切な期間保持します',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
        </div>

        {/* 第5条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第5条　禁止事項</h2>
          <p style={pStyle}>本サービスの利用にあたり、以下の行為を禁止します。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '虚偽の情報を登録・入力する行為',
              '他の利用者・第三者を誹謗中傷する行為',
              '本サービスのシステムに不正アクセスする行為',
              '本サービスを営利目的で無断転用する行為',
              '法令・公序良俗に反する行為',
              '当社または第三者の権利を侵害する行為',
              'その他、当社が不適切と判断する行為',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
        </div>

        {/* 第6条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第6条　サービスの変更・停止</h2>
          <p style={pStyle}>当社は、以下の場合にサービスの全部または一部を変更・停止することがあります。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              'システムのメンテナンス・アップデート',
              '天災・障害等の不可抗力',
              '事業上の理由によるサービス終了',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
          <p style={pStyle}>サービス終了の場合は、原則として30日前までにアプリ内でお知らせします。</p>
        </div>

        {/* 第7条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第7条　免責事項</h2>
          <p style={pStyle}>当社は、以下について責任を負いません。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '本サービスの利用により生じた損害（通信障害・システム障害等による損害を含む）',
              '船長会員と乗船客の間で生じたトラブル',
              '乗船中の事故・怪我・損害',
              '天候・海況による出船中止に伴う損害',
              '第三者による不正アクセスによる情報漏洩',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
          <div style={warningStyle}>⚠️ 本サービスは予約管理ツールであり、乗船の安全・乗船契約の内容については、各遊漁船業者と乗船客の間で直接ご確認ください。</div>
        </div>

        {/* 第8条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第8条　知的財産権</h2>
          <p style={pStyle}>本サービスに関する著作権・商標権・その他知的財産権は、当社に帰属します。本サービスのコンテンツを当社の許可なく複製・転載・転用することを禁じます。</p>
        </div>

        {/* 第9条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第9条　規約の変更</h2>
          <p style={pStyle}>当社は、必要に応じて本規約を変更することがあります。変更後の規約は、本サービス内での告知をもって効力を発します。変更後も本サービスをご利用いただいた場合、変更後の規約に同意したものとみなします。</p>
        </div>

        {/* 第10条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第10条　準拠法・管轄裁判所</h2>
          <p style={pStyle}>本規約は日本法に準拠します。本サービスに関する紛争については、当社所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </div>

        {/* 第11条 */}
        <div style={sectionStyle}>
          <h2 style={titleStyle}>第11条　海外からのご利用について</h2>
          <p style={pStyle}>本サービスおよび本規約は日本語のみで提供されます。日本語以外の言語による内容の解釈については、日本語版を正とします。</p>
          <p style={pStyle}>海外からご予約される場合も、本サービスをご利用いただいた時点で本規約に同意いただいたものとみなします。</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0' }}>
            {[
              '予約フォームへの入力は日本語または英語で行ってください',
              '国際電話番号（例：+1-XXX-XXXX-XXXX）での入力に対応しています',
              '緊急連絡先は日本国内・海外問わず記載してください',
            ].map(item => <li key={item} style={liStyle}>{item}</li>)}
          </ul>
          <div style={warningStyle}>※ 船長とのやりとりは基本的に日本語となりますのでご了承ください。</div>
        </div>

        {/* 改定履歴 */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px 28px', marginTop: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ocean)', marginBottom: '14px', paddingBottom: '10px', borderBottom: '2px solid var(--border)' }}>改定履歴</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--fg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>バージョン</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--fg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>改定日</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: 'var(--fg-2)', borderBottom: '1px solid var(--border)' }}>内容</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 14px', color: 'var(--fg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>第1版</td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>2026年5月</td>
                <td style={{ padding: '10px 14px', color: 'var(--fg-2)', borderBottom: '1px solid var(--border)' }}>制定</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* お問い合わせ先 */}
        <div style={{ background: 'linear-gradient(135deg, var(--ocean) 0%, #0F4570 100%)', borderRadius: '14px', padding: '28px', marginTop: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '14px', color: 'var(--gold)' }}>お問い合わせ先</h3>
          {[
            { label: '屋号', value: 'UTAKI SYSTEM' },
            { label: 'サービス名', value: 'FiShip' },
            { label: 'メール', value: 'co.utaki@gmail.com' },
            { label: 'URL', value: '[サービスURL] ※確定後更新' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '15px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', minWidth: '80px' }}>{label}</span>
              <span style={{ color: '#fff', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 制定日 */}
        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--fg-3)', marginTop: '40px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
          制定日：2026年5月　／　UTAKI SYSTEM
        </p>

      </div>
    </div>
  )
}
