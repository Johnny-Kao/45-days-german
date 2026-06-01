# 新語言課程部署指令

本文件供 AI 執行。將現有法語課程框架轉換為新語言課程，並完整部署。

---

## 背景說明

這個資料夾是一個 mobile-first 靜態語言學習 app，目前內容為法語。
框架（HTML/CSS/JS）保持不變，只需要替換課程資料和音檔。

**本次目標語言：德語**
**目標域名：de-lesson.johnnykao.com**
**GitHub 帳號：Johnny-Kao**

---

## 第一步：接收新 JSON 檔案

使用者會提供一個新的 JSON 檔案，格式與 `data/lessons.json` 相同：

```json
[
  {
    "id": "day01",
    "day": 1,
    "title": "...",
    "subtitle": { "zh": "...", "en": "...", "ja": "..." },
    "task": { "zh": "...", "en": "...", "ja": "..." },
    "audio": {
      "dialogueNormal": "assets/audio/day01/dialogue_normal.mp3",
      "dialogueSlow": "assets/audio/day01/dialogue_slow.mp3",
      "shadowing": "assets/audio/day01/shadowing.mp3"
    },
    "dialogue": [
      {
        "speaker": "A",
        "fr": "...",
        "zh": "...",
        "en": "...",
        "ja": "...",
        "audio": "assets/audio/day01/sentence_01.mp3"
      }
    ],
    "patterns": [...],
    "pronunciationNotes": [...],
    "grammarNote": { "zh": "...", "en": "...", "ja": "..." },
    "outputTask": {
      "title": { "zh": "今日輸出", "en": "Output task", "ja": "今日のアウトプット" },
      "instruction": { "zh": "...", "en": "...", "ja": "..." }
    },
    "coverKeywords": "berlin,german,language"
  }
]
```

**注意：** 對話句子的 key 名稱仍用 `"fr"` 存放目標語言文字（德語），app.js 讀取的就是這個 key，不需要改動 JS 邏輯。

---

## 第二步：清理舊音檔和舊課程資料

```bash
# 刪除所有舊音檔
rm -rf assets/audio/

# 刪除舊課程 JSON
rm -f data/lessons.json
```

---

## 第三步：放入新 JSON

將使用者提供的新 JSON 存為：

```
data/lessons.json
```

確認 JSON 格式正確：

```bash
python3 -c "import json; d=json.load(open('data/lessons.json')); print(f'{len(d)} lessons loaded, Day1: {d[0][\"title\"]}')"
```

---

## 第四步：加入 coverKeywords（如果 JSON 沒有的話）

如果新 JSON 裡每個 lesson 沒有 `coverKeywords` 欄位，用 Python 根據課程主題補上：

```python
import json

# 根據德語課程內容定義關鍵字（每天一組，依課程主題）
keywords = {
  'day01': 'berlin,germany,greeting',
  # ... 依課程內容定義
}

with open('data/lessons.json') as f:
    data = json.load(f)

for lesson in data:
    if 'coverKeywords' not in lesson:
        lesson['coverKeywords'] = keywords.get(lesson['id'], 'germany,german')

with open('data/lessons.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

---

## 第五步：確認並更新 TTS 語音設定

macOS 常見德語語音：

```bash
say -v '?' | grep -i "de_DE\|german"
```

常見德語語音名稱：`Anna`（女）、`Markus`（男）、`Petra`（女）

更新 `.env`（如果存在）：

```bash
# 將 MACOS_TTS_VOICE 改為德語語音，例如：
sed -i '' 's/MACOS_TTS_VOICE=.*/MACOS_TTS_VOICE=Anna/' .env 2>/dev/null || true
```

如果 `.env` 不存在，生成音檔時用 `--voice` 參數指定，或直接在 `generate_audio.py` 開頭修改預設值：

```python
VOICE = os.getenv("MACOS_TTS_VOICE", "Anna")  # 改成德語語音名稱
```

---

## 第六步：生成所有音檔

```bash
python3 scripts/generate_audio.py --all
```

預計每課約 9 個檔案（6 句單句 + Normal + Slow + Shadowing）。

生成完畢後確認：

```bash
find assets/audio -name "*.mp3" | wc -l
# 應該等於 課程天數 × 9（若每天6句）或略有差異
```

---

## 第七步：更新介面文字

修改以下兩處，將法語相關文字換成德語：

**`index.html`** — 第 8 行 title：
```html
<title>German Course</title>
```

**`app.js`** — `renderHome()` 函數內的標題（約第 130 行）：
```javascript
<h1>🇩🇪 German Course</h1>
<p>每天一個任務，用德語說出來</p>
```

---

## 第八步：本機測試

```bash
python3 -m http.server 8080
# 打開 http://localhost:8080 確認：
# - 課程列表正常顯示
# - 點入課程後音檔可播放
# - 封面圖片正常載入
```

---

## 第九步：Git commit 並推上 GitHub

```bash
git add -A
git commit -m "German course: replace content and regenerate audio"
git push
```

如果是全新 repo（複製此資料夾重新 init）：

```bash
git init
git branch -M main
git add index.html styles.css app.js .gitignore data/ assets/ scripts/ README.md
git commit -m "Initial release: German language course"
gh repo create Johnny-Kao/german-course --public --source=. --remote=origin --push
```

---

## 第十步：部署到 Cloudflare Pages

```bash
# 如果已有 45-days-french 專案，建新的：
wrangler pages project create german-course --production-branch main
wrangler pages deploy . --project-name german-course --branch main --commit-dirty=true
```

---

## 第十一步：設定自訂域名

```bash
ACCOUNT_ID="0baff6366af3f41b20559257cd911665"
TOKEN="$(grep oauth_token ~/Library/Preferences/.wrangler/config/default.toml | sed "s/.*= *//" | tr -d "'\"")"

# 在 Pages 加入自訂域名
curl -s -X POST \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/german-course/domains" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"de-lesson.johnnykao.com"}'
```

然後請使用者在 Cloudflare DNS 加一條記錄：

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `de-lesson` | `german-course.pages.dev` | ☁️ 開啟 |

完成後確認域名生效：

```bash
curl -s -o /dev/null -w "%{http_code}" https://de-lesson.johnnykao.com/
# 應回傳 200
```

---

## 完成檢查清單

- [ ] `data/lessons.json` 已替換為德語內容
- [ ] `assets/audio/` 全部為德語音檔
- [ ] `index.html` title 已更新
- [ ] `app.js` 首頁標題已更新
- [ ] 本機 http://localhost:8080 測試正常
- [ ] GitHub repo 已建立並推送
- [ ] Cloudflare Pages 已部署（`german-course.pages.dev` 可訪問）
- [ ] 自訂域名 `de-lesson.johnnykao.com` 已生效（HTTP 200）

---

## 注意事項

- `app.js` 裡對話句子讀取的是 `s.fr` 欄位，德語 JSON 應將德語文字放在 `"fr"` key 下，無需修改 JS
- `generate_audio.py` 的 `say` 指令只支援 macOS，需在 Mac 上執行
- Wrangler OAuth token 有效期約 24 小時，若過期執行 `wrangler login` 重新登入
- Cloudflare account ID 固定為 `0baff6366af3f41b20559257cd911665`
