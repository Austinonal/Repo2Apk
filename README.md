# Repo2App

เปลี่ยน GitHub repo ของเว็บ (HTML / JS / PWA / React / Vite) ให้เป็นแอป **Android, iOS, Windows, macOS และ Linux** โดยดูแผนและคะแนนก่อน แล้วค่อยกดยืนยันให้สร้างไฟล์

*English: a static site that turns a public GitHub web repo into Android / iOS / Windows / macOS / Linux apps. It shows a score and a plan first, builds only after you confirm, and builds run on GitHub Actions. UI and reports are in Thai and English.*

## ทำงานยังไง

```
เบราว์เซอร์ (GitHub Pages)              GitHub Actions (build.yml)
  วางลิงก์ repo                           prepare   clone repo, build เว็บ, ตัดไฟล์, หาไอคอน, เขียน report.md
  plan.mjs ดูแผน + ให้คะแนน (ไม่ต้องใช้ token)   android   Capacitor -> APK (+ AAB ถ้าตั้งคีย์)
  กดยืนยัน ──(token หรือ Worker)──▶       native    Electron -> exe / dmg / AppImage, Capacitor -> ipa + Xcode zip
  รอ แล้วอ่าน Release ──────────────────  publish   สแกน ClamAV, SHA-256, สร้าง Release
```

- **ดูแผนฟรี ไม่ต้องมี token** เว็บอ่าน repo ผ่าน GitHub API สาธารณะ (`scripts/plan.mjs`)
- **สร้างไฟล์ต้องมี token** ที่สั่ง workflow ใน repo นี้ได้ หรือใช้ Worker (ดูด้านล่าง)
- **แผนที่เห็นคือแผนที่รันจริง** เพราะหน้าเว็บ (`plan.mjs`) กับ build (`prepare.mjs`) ใช้กฎชุดเดียวกันใน `scripts/rules.mjs`

## ไฟล์สำคัญ

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html`, `style.css`, `app.js` | หน้าเว็บ ไม่มีขั้นตอน build ข้อความไทยอยู่ใน HTML ส่วนอังกฤษอยู่ใน `data-en="..."` |
| `scripts/rules.mjs` | กฎทั้งหมด: อะไรตัดออก, ไอคอน/manifest, ข้อความในแผน, **การให้คะแนน** (`CHECKS`, `grade()`) |
| `scripts/lang.mjs` | `L(ไทย, อังกฤษ)` ใช้เขียนข้อความสองภาษาในที่เดียว |
| `scripts/plan.mjs` | ทำแผนจากการอ่าน repo ผ่าน API (ฝั่งเบราว์เซอร์) |
| `scripts/prepare.mjs` | ฝั่ง build: ติดตั้ง/build เว็บ (npm, pnpm, yarn), ตัดไฟล์, ทำไอคอน 1024px ด้วย `sharp`, เขียน `report.md` |
| `.github/workflows/build.yml` | pipeline ทั้งหมด **ต้องอยู่ที่ `.github/workflows/`** ไม่งั้น GitHub ไม่เห็น |
| `worker/` | Cloudflare Worker ที่ถือ token แทนผู้ใช้ (ยังไม่ได้ deploy) อ่าน `worker/README.md` |
| `config.js` | `WORKER_URL` ว่าง = ผู้ใช้ใส่ token เอง |

## ติดตั้งใช้งาน (ใช้คนเดียว)

1. เปิด GitHub Pages ของ repo นี้ (Settings → Pages → Deploy from branch → `main`)
2. สร้าง fine-grained token ที่ https://github.com/settings/personal-access-tokens/new เลือกเฉพาะ repo นี้ สิทธิ์ **Actions** และ **Contents** = Read and write
3. เปิดเว็บ กด "ตั้งค่า token" ใส่ `ชื่อคุณ/Repo2Apk` กับ token (เก็บในเบราว์เซอร์เครื่องนั้นเท่านั้น)
4. **ห้ามใส่ token ลงในไฟล์ใน repo** repo นี้เป็น public

### Android ที่เซ็นแล้ว (ขึ้น Play Store)

ตั้ง secrets ใน repo นี้: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` จะได้ APK + AAB ที่เซ็นแล้ว ถ้าไม่ตั้ง จะได้แค่ debug APK

### ให้คนอื่นใช้โดยไม่ต้องมี token

ทำ Worker ตาม `worker/README.md` แล้วใส่ URL ใน `config.js`

## ทดสอบ

```
node scripts/grade.test.mjs     # คะแนน
node scripts/lang.test.mjs      # ข้อความอังกฤษต้องไม่มีตัวอักษรไทยหลุด
node worker/worker.test.mjs     # Worker (จำลอง GitHub)
```

ยังไม่มี test ของ `prepare.mjs` / `plan.mjs` (ตอนนี้ทดสอบมือด้วย repo ตัวอย่าง)

## สถานะ: อะไรพิสูจน์แล้ว อะไรยัง

- **พิสูจน์แล้ว:** แปลงเป็น Android APK ได้จริงบน GitHub Actions (เจ้าของลองแล้ว)
- **ทดสอบบนเครื่องเท่านั้น (ยังไม่เคยรันจริงบน Actions):** Windows / macOS / Linux / iOS, การสแกน ClamAV, การเซ็น Android release, ตัวเลือก pnpm/yarn, การหา dist ซ้อนชั้น (Angular)
- **ยังไม่ได้ deploy:** Worker
- **ที่เสี่ยงพังสุด:** iOS `.ipa` (ใช้ `xcodebuild archive` แบบไม่เซ็น) ถ้าพัง zip ของโปรเจกต์ Xcode ยังได้อยู่ และหน้าผลลัพธ์จะแสดง log 25 บรรทัดสุดท้าย

**ข้อควรรู้ด้านความปลอดภัย:** ขั้น `prepare` รันสคริปต์ของ repo ปลายทาง (`npm install` / `build`) จึงควรใช้กับ repo ที่ไว้ใจเท่านั้น workflow ปิด `persist-credentials` เพื่อไม่ให้สคริปต์เหล่านั้นอ่าน token ได้ ClamAV ไม่รับประกันความปลอดภัย และไฟล์ทั้งหมดยังไม่ได้เซ็นโค้ด (Windows SmartScreen / macOS Gatekeeper จะเตือน)

## ไอเดียต่อยอด (ยังไม่ได้ทำ)

เรียงตามที่แนะนำให้ทำก่อน ข้อ 1-3 ควรทำก่อนเพิ่มฟีเจอร์ใหม่ เพราะจะรู้ว่าพังตรงไหนจริง

### ทำก่อน
1. **ลองแปลงจริงให้ครบ** ติ๊กทุกแพลตฟอร์ม ลองกับ repo 3 แบบ: HTML ธรรมดา, Vite/React, Angular แล้วแก้ที่พัง
2. **เช็ค ClamAV บน runner จริง** ดูเวลาที่เพิ่มขึ้น (ติดตั้ง + โหลดฐานข้อมูล) ถ้าช้าเกินไป ให้ cache ฐานข้อมูลหรือสแกนเฉพาะไฟล์ที่ใหญ่ ดูด้วยว่าเปิดข้างใน `.dmg` / `.AppImage` ได้แค่ไหน
3. **เพิ่ม test ให้ `prepare.mjs` และ `plan.mjs`** ใช้ repo จำลองเหมือนที่ทดสอบมือ (มี fixture ได้ใน `scripts/`)

### ทำให้แปลงสำเร็จบ่อยขึ้น
- **เวอร์ชัน Node ตาม repo:** ตอนนี้ fix ที่ Node 22 ให้อ่าน `.nvmrc` / `.node-version` / `engines.node` แล้วส่งเข้า `actions/setup-node` ของ job `prepare`
- **ลองใหม่เมื่อเน็ตล่ม:** ครอบ `npm i` และ `./gradlew` ด้วย `for i in 1 2 3; do cmd && break; sleep 10; done` ถ้า log มี `ETIMEDOUT` / `ECONNRESET` บ่อย
- **Git LFS:** ถ้า `.gitattributes` มี `filter=lfs` ให้รัน `git lfs pull` หลัง clone และเตือนในแผน ไม่งั้นรูป/วิดีโอจะเป็นแค่ไฟล์ pointer
- **เตือนเรื่อง API / CORS:** ถ้า JS เรียก `fetch('/api/...')` แบบ path ตรงๆ หรือเรียกเซิร์ฟเวอร์ที่ไม่เปิด CORS ให้ `https://localhost` (Android), `capacitor://localhost` (iOS), `app://local` (คอม) จะใช้ไม่ได้ในแอป แก้ฝั่งเราไม่ได้ แต่ใส่คำเตือนใน `htmlFix` / แผนได้ เหมือนคำเตือน `http://`
- **Next.js:** ต้องตั้ง `output: 'export'` ตอนนี้แค่เตือนในรายงาน อาจตั้งให้เองได้
- **แพลตฟอร์มที่ repo ไม่ใช่เว็บล้วน:** repo ที่มี backend (Python, Node server) แปลงไม่ได้ ตอนนี้แค่ตัด `.py` ออกแล้วเตือน

### ฟีเจอร์ที่ผู้ใช้น่าจะอยากได้ (ควรรอให้มีคนใช้จริงก่อน)
- **บอกขนาดไฟล์ที่จะได้ก่อนแปลง** ในการ์ดคะแนน
- **แปลงจากลิงก์เว็บ** ไม่ต้องมี repo (ดูดหน้าเว็บมาห่อเป็นแอป)
- **เลือกสิทธิ์แอป** (กล้อง ตำแหน่ง ฯลฯ) ก่อนแปลง
- **ประวัติการแปลง** เก็บไว้ในเบราว์เซอร์ จะได้โหลดซ้ำโดยไม่ build ใหม่ (Release เก่าถูกลบเหลือ 20 ล่าสุดใน `publish`)
- **ผลสแกนเป็นป้ายบนหน้าผลลัพธ์** ตอนนี้ผลสแกนอยู่ในข้อความรายงานเท่านั้น
- **เปลี่ยนชื่อไฟล์ที่ดาวน์โหลด** ตอนนี้ทำไม่ได้เพราะลิงก์ดาวน์โหลดของ GitHub ไม่เปิด CORS (เปลี่ยนชื่อแอปทำได้แล้วโดย build ใหม่)

### ด้านความน่าเชื่อถือและการดูแล
- **เซ็นโค้ดจริง:** Windows (ใบรับรอง EV/OV), macOS (Apple Developer $99/ปี + notarize), iOS (บัญชี Apple Developer + ใบรับรอง) จะลดคำเตือนของระบบและโปรแกรมป้องกันไวรัสได้จริง ซึ่ง ClamAV ทำให้ไม่ได้
- **VirusTotal:** ตอนนี้ให้แค่ SHA-256 ถ้ามี API key อัปโหลดไฟล์และใส่ลิงก์ผลในรายงานได้
- **Worker:** deploy จริง และถ้ามีคนใช้เยอะ เพิ่มการจำกัดต่อ IP (ตอนนี้จำกัดแค่จำนวน build ที่รันพร้อมกัน 3 งาน และเช็ค Origin ซึ่งปลอมจากสคริปต์ได้)
- **น้ำหนักคะแนน:** ผมตั้งเอง (เช่น `.env` หัก 30, ไม่มีไอคอนหัก 25) ปรับได้ที่ตาราง `checks()` ใน `scripts/rules.mjs` ที่เดียว
- **คะแนนแยกตามแพลตฟอร์ม:** ตอนนี้เป็นคะแนนรวม repo แบบเดียว และ repo ที่ต้อง build (React/Vite) ตรวจได้น้อยกว่า เพราะเห็นแค่ซอร์ส
- **ภาษาอื่น:** เพิ่มได้โดยขยาย `L(th, en)` เป็นหลายภาษา หรือเปลี่ยนไปใช้ตารางคำแปล ถ้าภาษาเกิน 2

## หมายเหตุสำหรับคนมาต่อ

- ข้อความทุกจุดเขียนเป็น `L('ไทย', 'English')` ข้อความที่อยู่ในออบเจ็กต์ระดับโมดูลใช้ `get` (getter) ให้ตามภาษาที่เลือก ห้ามเปลี่ยนเป็นสตริงตรงๆ มิฉะนั้นภาษาจะค้างตอน import (`lang.test.mjs` จะจับให้)
- หน้าเว็บส่ง `lang` ไปกับ workflow เพื่อให้รายงานที่ build ออกมาเป็นภาษาเดียวกับหน้าเว็บ
- ฟอร์ม workflow รับ input ได้สูงสุด 10 ตัว ตอนนี้ใช้ 9 (`repo, branch, job, targets, skip, name, id, version, lang`)
- ชื่อแอปฝังอยู่ในตัวแอป การเปลี่ยนชื่อหลัง build ต้อง build ใหม่ (หน้าผลลัพธ์มีปุ่มทำให้)
- ทุก PR ที่ผ่านมา merge แบบ squash เข้า `main` ประวัติการตัดสินใจอยู่ในคำอธิบายของ PR #1-#6
