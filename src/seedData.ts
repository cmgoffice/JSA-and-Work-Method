import { setDoc } from "firebase/firestore";
import {
  projectDoc,
  wmsDoc,
  jsaDoc,
  metaDoc,
} from "./firebase";

const NOW = new Date().toISOString();

/** ข้อมูล Mock โครงการ ฯลฯ ตามโครงฟอร์มในแอป */
export const MOCK_PROJECTS = [
  {
    id: "mock-project-1",
    projectNo: "PRJ-2024-001",
    projectName: "โครงการตัวอย่าง CMG",
    location: "กรุงเทพมหานคร",
    projectManager: "ผู้จัดการโครงการ ตัวอย่าง",
    constructionManager: "ผู้จัดการก่อสร้าง ตัวอย่าง",
    projectStart: "2024-01-01",
    projectFinish: "2024-12-31",
    mainContractor: "CMG Engineering & Construction Co.,Ltd.",
    subContractor: "-",
    clientName: "ลูกค้าตัวอย่าง",
    projectNote: "ข้อมูลโครงการสำหรับทดสอบระบบ",
    updatedAt: NOW,
  },
];

export const MOCK_WMS = [
  {
    id: "mock-wms-1",
    project: "โครงการตัวอย่าง CMG",
    documentTitle: "วิธีการปฏิบัติงานติดตั้งระบบไฟฟ้า (ตัวอย่าง)",
    rev: "00",
    issueDate: "2024-06-01",
    description: "Initial Issue",
    preparedBy: "ผู้จัดทำ ตัวอย่าง",
    reviewedBy: "ผู้ตรวจสอบ ตัวอย่าง",
    approvedBy: "ผู้อนุมัติ ตัวอย่าง",
    scope: "<p>ขอบข่ายงานติดตั้งระบบไฟฟ้าภายในอาคาร ตามแบบที่อนุมัติ</p>",
    definition: "<p>งานที่อยู่ภายใต้ข้อกำหนดด้านความปลอดภัยและคุณภาพของบริษัท</p>",
    reference: "<p>แบบก่อสร้าง, มาตรฐาน มอก.</p>",
    equipment: "<p>เครื่องมือวัดไฟฟ้า, อุปกรณ์ติดตั้งสาย</p>",
    personnel: "<p>ช่างไฟฟ้า 2 คน, หัวหน้าคุมงาน 1 คน</p>",
    orgChart: "<p>แผนผังองค์กรโครงการ</p>",
    responsibility: "<p>หน้าที่และความรับผิดชอบตามบทบาทงาน</p>",
    preparation: "<p>ตรวจสอบแบบและจุดติดตั้งก่อนเริ่มงาน</p>",
    procedure: "<p>ขั้นตอนการเดินสาย การต่อวงจร และการทดสอบ</p>",
    finishWork: "<p>ทำความสะอาดพื้นที่และส่งมอบงาน</p>",
    inspectTesting: "<p>ทดสอบระบบและบันทึกผล</p>",
    jsa: "<p>อ้างอิง JSA งานติดตั้งระบบไฟฟ้า</p>",
    documentedInfo: "<p>แบบและรายการตรวจ</p>",
    updatedAt: NOW,
  },
];

export const MOCK_JSA = [
  {
    id: "mock-jsa-1",
    client: "ลูกค้าตัวอย่าง",
    project: "โครงการตัวอย่าง CMG",
    jobTitle: "งานติดตั้งระบบไฟฟ้า (ตัวอย่าง)",
    preparedBy: "ผู้จัดทำ ตัวอย่าง",
    reviewedBy: "ผู้ตรวจสอบ ตัวอย่าง",
    approvedBy: "ผู้อนุมัติ ตัวอย่าง",
    date: "2024-06-01",
    rev: "00",
    items: [
      {
        id: 1,
        step: "เตรียมเครื่องมือและตรวจสอบจุดทำงาน",
        hazard: "สะดุดล้ม, อุปกรณ์หล่น",
        control: "จัดเก็บสายและเครื่องมือให้เป็นระเบียบ สวม PPE",
        responder: "หัวหน้าคุมงาน",
      },
      {
        id: 2,
        step: "ตัดต่อวงจรไฟฟ้า",
        hazard: "ไฟฟ้าดูด, บาดแผล",
        control: "ตัดไฟก่อนทำงาน ใช้เครื่องมือฉนวน ใส่ถุงมือกันไฟฟ้า",
        responder: "ช่างไฟฟ้า",
      },
      {
        id: 3,
        step: "ทดสอบระบบหลังติดตั้ง",
        hazard: "ไฟฟ้าดูด",
        control: "ตรวจสอบก่อนจ่ายไฟ ใช้มาตรฐานการทดสอบ",
        responder: "ช่างไฟฟ้า",
      },
    ],
    updatedAt: NOW,
  },
];

/**
 * เขียนข้อมูล Mock ลง Firestore ครั้งเดียว (เรียกเมื่อยังไม่เคย seed)
 */
export async function seedMockDataToFirestore(): Promise<void> {
  for (const p of MOCK_PROJECTS) {
    await setDoc(projectDoc(p.id), p);
  }
  for (const w of MOCK_WMS) {
    await setDoc(wmsDoc(w.id), w);
  }
  for (const j of MOCK_JSA) {
    await setDoc(jsaDoc(j.id), j);
  }
  await setDoc(metaDoc(), { seeded: true, seededAt: NOW });
}
