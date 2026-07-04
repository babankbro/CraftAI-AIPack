/* ALPR prototype interactions (โทน Light & Airy) */
document.addEventListener('DOMContentLoaded', () => {

  // --- Score selector (หน้า CAM ตรวจประเมิน) ---
  document.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const group = this.closest('.score-selector');
      group.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      const radio = this.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });

  // --- Mock Google login (จำลอง OAuth + กำหนดบทบาท) ---
  const gbtn = document.getElementById('btn-google-login');
  if (gbtn) {
    gbtn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = prompt(
        "จำลองการล็อกอินด้วย Google (Mock)\nพิมพ์ 'CAT' = ครูผู้สอน (หน้าอัปโหลด)  หรือ  'CAM' = ครูพี่เลี้ยง (คิวตรวจ):",
        "CAT"
      );
      if (!role) return;
      navigate(role.trim().toUpperCase() === 'CAM' ? 'cam_queue.html' : 'cat_upload.html');
    });
  }
});

/* เปลี่ยนหน้าแบบนุ่มนวลด้วย View Transitions API (ถ้ารองรับ) */
function navigate(url) {
  if (document.startViewTransition) {
    document.startViewTransition(() => { window.location.href = url; });
  } else {
    window.location.href = url;
  }
}
