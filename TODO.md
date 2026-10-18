# งานที่ยังไม่ได้ทำ

ไอเดียที่คิดไว้แต่ยังไม่ได้ทำ เพราะยังไม่เห็นว่าเกิดปัญหาจริง ให้ดูจาก error ของการแปลงจริง (ในหน้าผลลัพธ์จะมี log 25 บรรทัดสุดท้าย) แล้วค่อยเลือกทำข้อที่เจอบ่อย

## สิ่งที่ควรทำก่อน
- [ ] ลองแปลง repo จริงอย่างน้อย 3 แบบ: HTML ธรรมดา, Vite/React, Angular แล้วจดว่าพังตรงไหน
  ยังไม่เคยมีใคร build จริงบน GitHub Actions ตัวที่เสี่ยงที่สุดคือ iOS `.ipa`

## ทำให้แปลงสำเร็จบ่อยขึ้น
- [ ] **เวอร์ชัน Node ตาม repo** ตอนนี้ fix ไว้ที่ Node 22 ถ้า repo เก่า build ไม่ผ่าน
  ให้อ่าน `.nvmrc` / `.node-version` / `engines.node` ใน package.json แล้วส่งเข้า
  `actions/setup-node` ของ job `prepare`
- [ ] **ลองใหม่เมื่อเน็ตล่ม** ถ้า log มี `ETIMEDOUT`, `ECONNRESET` หรือ Gradle โหลดไม่สำเร็จบ่อย
  ให้ครอบ `npm i` / `./gradlew` ด้วย `for i in 1 2 3; do cmd && break; sleep 10; done`
- [ ] **Git LFS** repo ที่เก็บรูป/วิดีโอด้วย LFS จะได้ไฟล์ pointer แทนไฟล์จริง
  ถ้า `src/.gitattributes` มีคำว่า `filter=lfs` ให้รัน `git lfs pull` หลัง clone
  และเพิ่มคำเตือนในแผน (`plan.mjs`) ด้วย

## ทำให้แอปที่ได้ใช้งานได้จริง
- [ ] **เตือนเรื่อง API / backend** ถ้า JS เรียก `fetch('/api/...')` แบบ path ตรงๆ
  หรือเรียกเซิร์ฟเวอร์ที่ไม่เปิด CORS ให้ `https://localhost` (Android), `capacitor://localhost` (iOS)
  และ `app://local` (คอม) จะใช้ไม่ได้ในแอป แก้ฝั่งเราไม่ได้ แต่ใส่คำเตือนใน `htmlFix` / แผนได้
  แบบเดียวกับคำเตือน `http://`
- [ ] **SPA routing บนมือถือ** แก้ไปแล้วบน Electron (หน้า /about ไม่ว่าง) ส่วน Capacitor
  รองรับอยู่แล้ว ถ้าเจอปัญหาจริงค่อยดู `server.androidScheme` ใน capacitor config
