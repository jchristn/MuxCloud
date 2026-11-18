import type { MobileCatalog } from './en';

export const ja: MobileCatalog = {
  common: { back: '戻る', confirm: '確認', all: 'すべて', name: '名前', filter: '絞り込み' },
  auth: { server: 'サーバー: {{url}}', changeServer: 'サーバーを変更', insecure: 'このサーバーは暗号化されていない HTTP を使用しています。パスワードと会話は暗号化されずに送信されます。自分のネットワーク外では HTTPS を使ってください。', readTerms: '利用規約', readPrivacy: 'プライバシーポリシー', verifyCode: '確認コード', verifyCodeHint: '任意: メールのリンク末尾にあるコードを貼り付けます。', verifyButton: '確認する' },
  server: { title: 'Mux Cloud サーバー', subtitle: 'app.usemux.ai か、自分でホストする Mux Cloud サーバーを使います。', url: 'サーバー URL', connect: '接続', useDefault: 'app.usemux.ai を使う', invalid: 'https://app.usemux.ai のような URL を入力してください。', notMuxCloud: 'このアドレスは応答しましたが、Mux Cloud サーバーではありません。' },
  machine: { lastSeen: '最終確認 {{time}}', awaiting: '{{count}} 件待機中', runs: '{{count}} 件実行中', manage: '管理', liveReconnecting: 'ライブ更新を再接続しています。引っ張って更新できます。', offlineConversations: '会話はマシン上にあり、再接続すると表示されます。', pickConversation: '会話を選択' },
  chat: {
    placeholder: 'mux にメッセージ', send: '送信', stop: '停止', thinking: '考え中...', replying: 'mux が返信中', showThinking: '思考を表示', hideThinking: '思考を隠す', tokens: '{{count}} トークン', endpoint: 'エンドポイント', endpointValue: 'エンドポイント: {{endpoint}}',
    noEndpoint: 'このマシンにはエンドポイントがありません。管理のエンドポイントから追加してください。', noEndpointShort: 'なし', planMode: '計画', planModeHint: 'モデルがまず計画を提案し、実行するまで何も変更しません。', planTitle: '提案された計画', runPlan: 'この計画を実行',
    switched: 'エンドポイント {{endpoint}}（{{model}}）に切り替えました', mirroring: '別の画面で開始された実行をここでライブ表示しています。', mirrorAlways: 'アプリでは常にライブミラーが有効です。どこで開始された実行もここに表示されます。', unknownCommand: '不明なコマンド: {{command}}（/? を試してください）', noStats: '完了したターンはまだありません。',
    statsBody: '**直前のターン**\n\n- モデル: `{{model}}`\n- 最初のトークンまで: {{ttft}} ms\n- ストリーミング: {{streaming}} ms\n- 合計: {{total}} ms\n- トークン: 入力 {{input}}、出力 {{output}}',
    help: '**チャットコマンド**\n\n- `/?`、`/help`: この一覧を表示\n- `/new`、`/clear`: 新しい会話を開始\n- `/context`、`/stats`: 直前のターンの時間とトークン\n- `/usage`、`/endpoints`、`/models`、`/mcp`、`/prompts`、`/skills`、`/subagents`、`/pricing`、`/hooks`、`/commands`、`/keybindings`、`/settings`: その画面を開く\n- `/<skill> 引数`: スキルを実行',
  },
  approval: { title: 'mux に {{tool}} の実行を許可しますか?', aTool: 'ツール', onMachine: '{{name}} 上', approve: '許可', always: 'このセッション中は許可', deny: '拒否', autoIn: '{{seconds}} 秒後に自動で許可', noAuto: 'このエンドポイントでは自動許可がオフです。' },
  approvals: { tab: '承認', title: '承認待ち', intro: 'ツールの承認待ちで一時停止しているマシン上の実行です。', waiting: '待機中', empty: '承認待ちはありません', emptyBody: '実行がツールの承認を必要とすると、ここに表示され通知も届きます。', open: '{{name}} の承認待ちの実行を開く', someOff: '一部のマシンでリモートでのツール承認がオフになっています。ここからそのマシンで開始した実行は、承認が必要なツールを拒否します。' },
  new: { endpoint: 'エンドポイントとモデル', addEndpoint: 'エンドポイントを追加', default: 'デフォルト', folder: '作業フォルダー', folderPath: 'マシン上のフォルダー', folderHint: 'マシン上の既存のフォルダーならどこでも使えます。空欄にすると mux の実行場所を使います。', folderPlaceholder: '/Users/me/projects/app', home: 'ホームフォルダー', sessions: '会話 {{count}} 件', start: '会話を開始' },
  session: { title: 'タイトル', rename: '名前を変更', labelsHint: 'カンマ区切り。', tags: 'タグ', tagsHint: 'キー=値 のペアをカンマ区切りで。', saveMetadata: 'ラベルとタグを保存', export: 'エクスポート', share: 'エクスポートして共有', deleteTitle: '「{{title}}」を削除しますか?', deleteBody: '会話はマシンから削除され、元に戻せません。', select: '選択', deleteSelected: '選択した {{count}} 件を削除', bulkDeleteTitle: '{{count}} 件の会話を削除しますか?', longPressHint: '長押しで操作を表示。' },
  manage: {
    configure: '設定', defaultEndpoint: 'デフォルトのエンドポイント', noDefault: 'デフォルトのエンドポイントはまだありません。', environment: '環境', version: 'mux のバージョン', uptime: '稼働時間', activePrompt: '有効なプロンプト', auth: 'API キー', configDir: '設定フォルダー', cloudIncluded: 'Mux Cloud を含む',
    endpoints: 'エンドポイント', endpointsIntro: 'このマシンが使えるモデルのバックエンド。', mcp: 'MCP サーバー', mcpIntro: 'mux が接続するツールサーバー。', prompts: 'プロンプト', promptsIntro: 'システムプロンプトのプロファイル。1 つが有効です。', subagents: 'サブエージェント', subagentsIntro: 'メインのエージェントが作業を任せられる専用エージェント。',
    hooks: 'フック', hooksIntro: 'エージェントのイベントで実行されるコマンド。', commands: 'カスタムコマンド', commandsIntro: 'プログラムを実行するスラッシュコマンド。', keybindings: 'キー割り当て', keybindingsIntro: 'mux ターミナル UI のキーボードショートカット。',
    settings: '設定', settingsIntro: 'このマシンの mux 設定すべて (Mux Cloud を含む)。', catalog: 'プロンプトカタログ', catalogIntro: 'mux が使う組み込みプロンプトと上書き。', skills: 'スキル', skillsIntro: 'スキルとスキルパック。', usage: '使用状況', usageIntro: '呼び出し、トークン、コスト、レイテンシー。',
    pricing: '料金', pricingIntro: '100 万トークンあたりの料金。コスト計算に使います。', palettes: 'カラーパレット', palettesIntro: 'このマシンのターミナル、デスクトップアプリ、ダッシュボード、VS Code の色。', add: '{{name}}に追加', active: '有効', secretSet: 'シークレット設定済み',
    validate: '接続をテスト', validateOk: '接続しました', validateFailed: '接続できません', validateTools: '{{count}} 個のツールが使えます。', setDefault: 'デフォルトにする', activate: '有効にする', importModels: 'モデルをインポート', importTitle: '{{count}} 個のモデルをインポートしますか?', importAll: 'すべてインポート', importFailed: 'モデルを一覧表示できません。', saved: '保存しました。', settingsRemote: '変更は、マシン上で直接操作したのとまったく同じようにマシンに適用されます。',
  },
  form: { onePerLine: '1 行に 1 つ。', addItem: '{{name}}に追加', secretPlaceholder: '空欄なら保存済みの値を維持します', notANumber: '数値を入力してください。', keyRequired: '{{field}} は必須です。', duplicate: '「{{name}}」はすでに存在します。', deleteTitle: '「{{name}}」を削除しますか?', deleteBody: 'マシンから削除されます。', emptyTitle: '{{name}}はまだありません', unnamed: '(名前なし)' },
  skills: { packs: 'スキルパック', create: '新しいスキル', enable: '{{name}} を有効にする', invalid: '無効', mutating: 'ファイルを変更', category: 'カテゴリー', categoryHint: '空欄にするとスキルファイルのカテゴリーを使います。', install: 'インストール', remove: '削除', installAll: 'すべてインストール', removeAll: 'すべて削除' },
  catalog: { overridden: '上書き済み', reset: 'デフォルトに戻す', effective: 'プロンプトの本文', default: 'デフォルト', placeholders: 'プレースホルダー: {{list}}' },
  usage: {
    range: '期間', ranges: { hour: '1 時間', day: '1 日', week: '1 週間', month: '1 か月', quarter: '四半期', year: '1 年', all: '全期間' }, dims: { model: 'モデル', endpoint: 'エンドポイント', provider: 'プロバイダー', callkind: '呼び出しの種類' },
    calls: '呼び出し', tokens: 'トークン', cost: 'コスト', errorRate: 'エラー率', timeline: '推移', breakdown: '内訳', failures: '失敗', noFailures: '失敗した呼び出しはありません。', heatmap: 'トークンのヒートマップ', history: '呼び出し履歴', exportCsv: 'CSV をエクスポート', empty: 'この期間の使用はありません。', disabled: 'このマシンでは使用状況の記録がオフです。設定でオンにしてください。',
  },
  pricing: { model: 'モデル', input: '入力', cached: 'キャッシュ入力', output: '出力', add: 'モデルを追加' },
  palettes: { system: 'システムに合わせる', dark: 'ダーク', light: 'ライト', builtIn: '組み込み', custom: 'カスタム', longPress: 'タップでパレットを使い、長押しでカスタマイズします。', saveCopy: 'カスタムパレットとして保存' },
  account: { tab: 'アカウント', title: 'アカウント', verified: 'メール確認済み', unverified: 'メール未確認', plan: 'プラン: {{plan}}', profile: 'プロフィール', password: 'パスワード', currentPassword: '現在のパスワード', changePassword: 'パスワードを変更', passwordChanged: 'パスワードを変更しました。ほかのセッションはサインアウトされました。', sessions: 'サインイン中のセッション', thisDevice: 'このデバイス', revoke: 'サインアウト', revoked: 'セッションをサインアウトしました。', appSettings: 'アプリの設定', signOut: 'サインアウト', deleteAccount: 'アカウントを削除', deleteBody: 'アカウント、マシン、セッションが Mux Cloud から削除されます。会話はマシンに残ります。元に戻すことはできません。', deleteConfirm: '確認のため {{word}} と入力してください。', deleteWord: 'DELETE' },
  settings: {
    server: 'サーバー', serverHint: 'タップして変更。サーバーごとにサインイン状態を保持します。', theme: '外観', themeSystem: 'システム', themeLight: 'ライト', themeDark: 'ダーク', language: '言語', languageDevice: 'デバイスの言語を使う', restartForDirection: 'レイアウトの方向を切り替えるにはアプリを再起動してください。', security: 'セキュリティ',
    biometric: 'Face ID または指紋でロック', biometricHint: 'アプリを開いたときと戻ったときに確認します。', biometricUnavailable: 'まずこのデバイスで Face ID、Touch ID、または指紋を設定してください。', notifications: '通知',
    push: { unknown: '通知を確認しています...', registered: '実行が承認を必要とするときや完了したときに通知が届きます。', denied: 'Mux の通知はオフです。システム設定でオンにしてください。', notConfigured: 'このビルドでは通知が設定されていません。', unsupported: 'このサーバーはまだ通知を送信しません。', simulator: '通知には実機が必要です。', failed: '通知を有効にできませんでした。' },
    about: 'このアプリについて', version: 'バージョン', operator: '運営', contact: '連絡先',
  },
  lock: { title: 'Mux はロックされています', unlock: 'ロック解除', prompt: 'Mux のロックを解除' },
};
