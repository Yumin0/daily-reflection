# 部署步驟指南 (Deploy to Vercel)

## 第一步：設置 Supabase 數據庫

### 1. 在 Supabase 創建表
1. 登錄到 [Supabase](https://supabase.com)
2. 進入你的項目
3. 點擊 "SQL Editor"
4. 運行以下 SQL 命令創建表：

```sql
create table reflections (
  id bigint primary key generated always as identity,
  date date not null unique,
  score integer not null,
  diet text[] default array[]::text[],
  work text[] default array[]::text[],
  rest text[] default array[]::text[],
  growth text[] default array[]::text[],
  created_at timestamp default now(),
  updated_at timestamp default now()
);

alter table reflections enable row level security;

create policy "Allow read access for all users" on reflections
  for select using (true);

create policy "Allow insert/update for all users" on reflections
  for insert with check (true);

create policy "Allow update for all users" on reflections
  for update using (true);
```

### 2. 獲取 Supabase 憑據
1. 進入 "Settings" → "API"
2. 複製以下值：
   - `Project URL` → 設為 `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → 設為 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 第二步：本地測試

1. 複製 `.env.local.example` 為 `.env.local`
2. 填入上面獲得的 Supabase 值
3. 運行開發服務器：
   ```bash
   npm run dev
   ```
4. 打開 http://localhost:3000 測試

## 第三步：上傳到 GitHub

1. 在 GitHub 創建新倉庫（例如：`daily-reflection`）
2. 在本地運行：
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/daily-reflection.git
   git push -u origin main
   ```

## 第四步：部署到 Vercel

### 方式一：使用 Vercel 網頁界面（推薦新手）

1. 登錄 [Vercel](https://vercel.com)
2. 點擊 "Add New..." → "Project"
3. 選擇 GitHub 倉庫 `daily-reflection`
4. 在 "Environment Variables" 添加：
   - `NEXT_PUBLIC_SUPABASE_URL` = 你的 Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 Supabase 密鑰
5. 點擊 "Deploy"
6. 等待部署完成，你會獲得一個 `.vercel.app` 的網址

### 方式二：使用 Vercel CLI

```bash
npm install -g vercel
vercel
# 跟隨提示登錄並配置環境變數
```

## 完成！

你的應用現在已在以下地址訪問：
- `https://your-project-name.vercel.app`

每當你將代碼推送到 GitHub 時，Vercel 會自動部署新版本。

## 常見問題

### Q: 如何更新應用程式？
A: 在本地修改代碼，提交到 GitHub，Vercel 會自動部署。

### Q: 我的數據會存在哪裡？
A: 所有數據都存儲在 Supabase（雲數據庫）中，完全安全。

### Q: 我可以自定義表單選項嗎？
A: 是的！編輯 `src/components/DailyReflection.tsx` 中的 `dietItems`、`workItems` 等陣列。
