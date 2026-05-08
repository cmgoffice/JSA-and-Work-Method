# วิธีการ Deploy Storage Rules ไปยัง Firebase

## ปัญหาที่พบ
การอัปโหลดไฟล์ล้มเหลวเนื่องจากไม่มี Storage Rules ที่อนุญาตให้ผู้ใช้อัปโหลดไฟล์

## การแก้ไข
1. สร้างไฟล์ `storage.rules` ที่กำหนดสิทธิ์การเข้าถึง Firebase Storage
2. อัปเดต `firebase.json` เพื่อเพิ่มการตั้งค่า Storage Rules
3. ปรับปรุงการจัดการข้อผิดพลาดในโค้ดให้แสดงข้อความที่ชัดเจนขึ้น

## ขั้นตอนการ Deploy

### 1. ตรวจสอบว่าติดตั้ง Firebase CLI แล้ว
```bash
firebase --version
```

หากยังไม่ได้ติดตั้ง ให้รันคำสั่ง:
```bash
npm install -g firebase-tools
```

### 2. Login เข้า Firebase
```bash
firebase login
```

### 3. Deploy Storage Rules
```bash
firebase deploy --only storage
```

หรือ Deploy ทั้ง Firestore และ Storage Rules พร้อมกัน:
```bash
firebase deploy --only firestore,storage
```

### 4. ตรวจสอบ Storage Rules ใน Firebase Console
1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. เลือก Project ของคุณ
3. ไปที่ **Storage** > **Rules**
4. ตรวจสอบว่า Rules ถูก Deploy สำเร็จ

## Storage Rules ที่ตั้งค่าไว้

ไฟล์ `storage.rules` อนุญาตให้:
- ผู้ใช้ที่ล็อกอินแล้วเท่านั้นที่สามารถอัปโหลดและอ่านไฟล์ได้
- จำกัดขนาดไฟล์ไม่เกิน 10MB
- รองรับไฟล์ประเภท:
  - รูปภาพ (image/*)
  - PDF (application/pdf)
  - Word Documents (application/msword, .docx)
  - Text files (text/*)

## การทดสอบ

หลังจาก Deploy แล้ว:
1. เปิดแอปพลิเคชัน
2. ล็อกอินเข้าสู่ระบบ
3. ลองอัปโหลดไฟล์ในส่วน JSA
4. ตรวจสอบว่าไฟล์อัปโหลดสำเร็จ

## หมายเหตุ

- หากยังพบปัญหา ให้ตรวจสอบ Console ใน Browser (F12) เพื่อดูข้อความข้อผิดพลาดที่ละเอียดขึ้น
- ตรวจสอบว่า `.env` มีการตั้งค่า `REACT_APP_FIREBASE_STORAGE_BUCKET` ถูกต้อง
- ตรวจสอบว่า Firebase Storage ถูกเปิดใช้งานใน Firebase Console
