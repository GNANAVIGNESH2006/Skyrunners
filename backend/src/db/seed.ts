import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database';

/**
 * Seeds a demo "College Student Handbook" knowledge base with pre-chunked text.
 * This allows the application to work immediately without uploading documents.
 */
export function seedDemoData(): void {
  const db = getDb();

  // Check if demo data already exists
  const existing = db.prepare(
    `SELECT id FROM knowledge_bases WHERE name = 'College Student Handbook (Demo)'`
  ).get() as { id: string } | undefined;

  if (existing) return; // Already seeded

  console.log('✓ Seeding demo knowledge base...');

  const kbId = uuidv4();
  const now = new Date().toISOString();

  // Create demo knowledge base
  db.prepare(`
    INSERT INTO knowledge_bases (id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    kbId,
    'College Student Handbook (Demo)',
    'Demo knowledge base pre-loaded with college rules, attendance policies, exam regulations, hostel rules, and academic guidelines. This is DEMO DATA and does not represent any real institution.',
    now, now
  );

  // Demo documents with their chunks
  const demoDocuments: Array<{
    name: string;
    type: string;
    chunks: Array<{ content: string; page: number }>;
  }> = [
    {
      name: 'Attendance_Policy.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `ATTENDANCE POLICY

1. Minimum Attendance Requirement
All students are required to maintain a minimum attendance of 75% in each subject/course per semester. Students who fail to meet this threshold will not be allowed to appear in the end-semester examinations.

2. Calculation of Attendance
Attendance is calculated separately for each subject. The percentage is computed as:
Attendance % = (Classes Attended / Total Classes Held) × 100

3. Condonation of Shortage
Students with attendance between 65% and 74% may apply for condonation of attendance shortage by submitting a formal application to the Dean of Academic Affairs, along with valid reasons and supporting documents (medical certificates, family emergency letters, etc.). Condonation is NOT guaranteed and is at the discretion of the authority.

4. Students with Attendance Below 65%
Students with attendance below 65% in any subject will be detained and will not be permitted to sit for the end-semester examination in that subject. They must repeat the subject in the next academic year.

5. Monitoring of Attendance
Attendance is recorded by the subject teacher at the beginning of each class. Attendance registers are maintained and submitted to the academic office at the end of each month. Students can view their attendance on the student portal.`,
        },
        {
          page: 2,
          content: `ATTENDANCE POLICY (CONTINUED)

6. Leave of Absence
Students seeking planned leave must apply in advance through the Leave Application Form available at the Academic Office. Approval must be obtained from the HOD before the leave begins.

Unplanned leave (medical, family emergency) must be notified within 3 working days of the student's return by submitting the Leave Application Form along with relevant documents.

7. Medical Leave
Students absent due to illness for 3 or more consecutive days must submit a medical certificate from a registered medical practitioner. The medical leave will be considered while calculating attendance, but it does not automatically grant attendance credit.

8. Duty Leave
Duty leave is granted for participation in authorized co-curricular and extra-curricular activities such as inter-college competitions, NSS/NCC camps, cultural events, etc. Applications for duty leave must be submitted through the respective faculty advisor. Duty leave days are counted as present for attendance purposes.

9. Consequences of Insufficient Attendance
Students who do not meet the minimum attendance requirement will:
- Receive an attendance warning letter sent to their registered email and home address.
- Be barred from appearing in the end-semester examinations.
- Be required to repeat the semester or the subject, as applicable.
- Have their parents/guardians informed.`,
        },
      ],
    },
    {
      name: 'Examination_Rules.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `EXAMINATION RULES AND REGULATIONS

1. Eligibility for Examinations
A student is eligible to appear in the end-semester examination only if:
- They have maintained a minimum of 75% attendance in all subjects.
- They have paid all dues and fees for the current semester.
- They have not been debarred by the Disciplinary Committee.
- Their admit card/hall ticket has been issued by the Examination Office.

2. Examination Schedule
The examination schedule (date sheet) is published at least 21 days before the commencement of examinations. It is the student's responsibility to check the schedule and appear for examinations as per the published date sheet.

3. Reporting to the Examination Hall
Students must report to the examination hall at least 15 minutes before the scheduled start time. No student will be allowed to enter the examination hall after 30 minutes from the commencement of the examination. Students may not leave the hall during the first 60 minutes of the examination.

4. Permitted Items
Students are allowed to carry:
- Valid Hall Ticket / Admit Card (mandatory)
- College ID Card (mandatory)
- Pens, pencils, rulers, and mathematical instruments as required
- Calculator (only if explicitly permitted for the paper)

5. Prohibited Items
The following items are strictly prohibited inside the examination hall:
- Mobile phones, smartwatches, Bluetooth devices, or any electronic communication device
- Books, notes, or printed/written material (unless open-book exam)
- Bags or pouches
- Any unauthorized device`,
        },
        {
          page: 2,
          content: `EXAMINATION RULES AND REGULATIONS (CONTINUED)

6. Malpractice and Unfair Means
Any student found using or attempting to use unfair means during the examination will be penalized as follows:
- First offense: Cancellation of the paper and zero marks for that paper.
- Second offense: Cancellation of all papers for that semester.
- Third offense or serious malpractice (impersonation, organized cheating): Expulsion from the institution.

7. Internal Assessment (IA) Marks
Internal assessment marks are awarded based on:
- Class tests and quizzes (40% of IA)
- Assignments and projects (30% of IA)
- Attendance and class participation (20% of IA)
- Seminars or presentations (10% of IA)
Students must pass the internal assessment (minimum 40% of IA marks) to qualify for the end-semester examination.

8. Passing Criteria
- Minimum passing marks in end-semester examination: 40% of maximum marks.
- Minimum passing marks in internal assessment: 40% of IA maximum marks.
- Minimum aggregate (IA + End-Semester) to pass a subject: 50%.

9. Re-examination / Supplementary Exams
Students who fail one or two subjects are eligible for the supplementary examination conducted within two months of the end-semester results. Students who fail in more than two subjects must repeat the full semester.

10. Result Declaration
Results are declared within 45 days of the completion of the end-semester examination.`,
        },
      ],
    },
    {
      name: 'Hostel_Rules.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `HOSTEL RULES AND REGULATIONS

1. Eligibility for Hostel
Hostel accommodation is provided to outstation students on a first-come-first-served basis based on merit and availability. Day-scholars are not eligible for hostel accommodation unless specially approved by the Hostel Warden.

2. Hostel Timings
- Morning: Students must leave for college by 8:00 AM on all working days.
- Evening: Students must return to the hostel by 7:00 PM on weekdays.
- Night: Lights-out (quiet hours) start at 10:30 PM.
- Weekend curfew: 9:00 PM on Saturdays; 8:00 PM on Sundays.

3. Gate Pass / Outpass
Students wishing to go out of the campus after 6:00 PM on weekdays must obtain a Gate Pass from the Hostel Warden. Gate passes are issued only for genuine reasons such as medical appointments, family visits, or academic requirements. Late return without a valid gate pass will result in disciplinary action.

4. Visiting Hours
Visitors (family members only) are permitted in the hostel reception area between 4:00 PM and 6:00 PM on Sundays and public holidays. Friends, day-scholars, and non-family members are not allowed inside the hostel building under any circumstances.

5. Overnight Leave (Home Leave)
Students may apply for overnight home leave on weekends. The leave application must be submitted by Thursday 5:00 PM. Written consent from the parent/guardian is required. Students must sign out at departure and sign in on return.`,
        },
        {
          page: 2,
          content: `HOSTEL RULES AND REGULATIONS (CONTINUED)

6. Room Regulations
- Students must keep their rooms clean and tidy at all times.
- Room inspections are conducted every Monday morning by the Hostel Warden.
- Damage to hostel property will result in a fine and repair charges payable by the responsible student.
- Cooking in rooms is strictly prohibited. Students must use the hostel dining hall.
- Electric appliances such as heaters, immersion rods, and irons are not permitted in rooms (fire hazard).
- Students may use: laptop, table fan, mobile charger.

7. Mess and Dining Hall
- Breakfast: 7:00 AM – 8:00 AM
- Lunch: 12:30 PM – 2:00 PM
- Evening Snacks: 5:00 PM – 5:30 PM
- Dinner: 7:30 PM – 9:00 PM
Students must carry their mess card to all meals. Mess charges are included in the hostel fees. Feedback on mess quality may be submitted to the Mess Committee.

8. Discipline and Prohibited Activities
The following are strictly prohibited in the hostel:
- Consumption of alcohol, tobacco, or any illegal substance.
- Ragging in any form.
- Noise disturbances after 10:30 PM.
- Gambling.
- Possession of weapons.
- Political activities or provocative gatherings.

Violation of hostel rules may result in: written warning, suspension from hostel, or permanent expulsion from hostel accommodation.`,
        },
      ],
    },
    {
      name: 'Library_Rules.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `LIBRARY RULES AND REGULATIONS

1. Membership and Library Cards
Every enrolled student is issued a library card at the time of admission. The library card is non-transferable. Loss of library card must be reported to the Library immediately, and a replacement card will be issued on payment of Rs. 50/-.

2. Borrowing Privileges
- Undergraduate students: 3 books at a time, for 14 days.
- Postgraduate students: 5 books at a time, for 21 days.
- Books may be renewed once (for another 14 days) if not reserved by another student.
- Reference books, journals, magazines, and newspapers cannot be borrowed and must be read within the library.

3. Fine for Late Return
A late fine of Rs. 2/- per day per book will be charged for delayed returns. Students with outstanding fines exceeding Rs. 100/- will have their borrowing privileges suspended until the fine is cleared.

4. Library Hours
- Monday to Friday: 8:00 AM – 8:00 PM
- Saturday: 9:00 AM – 5:00 PM
- Sunday and Public Holidays: Closed (special reading room open during examination season: 10:00 AM – 5:00 PM)

5. Conduct in the Library
- Silence must be maintained at all times.
- Mobile phones must be switched to silent mode.
- Food and beverages are not permitted inside the library.
- Students must sign in and out using the entry register at the library entrance.
- Bags must be deposited at the bag counter near the entrance.`,
        },
      ],
    },
    {
      name: 'Academic_Regulations.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `ACADEMIC REGULATIONS

1. Academic Calendar
The academic year consists of two semesters:
- Odd Semester: July to November
- Even Semester: January to May
A minimum of 90 working days (18 instructional weeks) is maintained per semester.

2. Credit System
The institution follows a Credit-Based Grading System. Each course is assigned credits based on the contact hours per week:
- 1 credit = 1 lecture hour per week (or 2 lab hours per week)
- Minimum credits required for graduation: 160 (for four-year UG programs)

3. Grading Scale
| Grade | Marks Range | Grade Points |
|-------|-------------|--------------|
| O     | 90–100      | 10           |
| A+    | 80–89       | 9            |
| A     | 70–79       | 8            |
| B+    | 60–69       | 7            |
| B     | 50–59       | 6            |
| C     | 40–49       | 5            |
| F     | Below 40    | 0            |

4. CGPA Calculation
CGPA = Sum of (Grade Points × Credits) / Total Credits attempted

5. Academic Probation
Students with CGPA below 5.0 at the end of any semester will be placed on Academic Probation. They must meet with their Academic Advisor and submit an Academic Improvement Plan. If CGPA does not improve above 5.0 in the next semester, the student may face termination of enrollment.`,
        },
        {
          page: 2,
          content: `ACADEMIC REGULATIONS (CONTINUED)

6. Promotion Rules
- Students must pass all subjects to be promoted to the next semester.
- Students with a backlog (failed subject) in more than 2 subjects will be held back and must repeat the semester.
- Backlog subjects must be cleared within 3 years from the date of first failure.

7. Course Registration
Students must register for courses online at the start of each semester within the stipulated registration window. Late registration is subject to a penalty fee. Dropping a course after the registration deadline requires the approval of the Dean.

8. Internship / Industrial Training
All UG students must complete a minimum 8-week industry internship before the final year. The internship report must be submitted to the Department within 2 weeks of completion. Internship grades contribute to the final CGPA.

9. Project / Dissertation
Final-year students must complete a project/dissertation under the supervision of a faculty guide. Project evaluation includes:
- Progress report and review: 40%
- Final project submission: 60%

10. Anti-Ragging Policy
Ragging in any form—physical, mental, verbal, or cyber—is a serious offense under UGC regulations and Indian law. Any student found guilty of ragging faces:
- Immediate suspension pending inquiry.
- Expulsion from the institution.
- FIR and police complaint.
Students who witness ragging must report it immediately to the Anti-Ragging Committee.`,
        },
      ],
    },
    {
      name: 'Discipline_and_Placement.txt',
      type: 'txt',
      chunks: [
        {
          page: 1,
          content: `DISCIPLINE RULES

1. Code of Conduct
All students are expected to behave with dignity and respect toward fellow students, faculty, staff, and visitors. Students must:
- Dress appropriately as per the college dress code.
- Carry their college ID card at all times on campus.
- Not indulge in any behavior that disrupts the academic environment.

2. Dress Code
- Boys: Formal trousers, formal shirt, and shoes. No torn jeans, shorts, or sleeveless shirts.
- Girls: Formal trousers/salwar-kameez, formal shirt/kurti, and shoes/sandals. No revealing clothing.
On cultural/sports event days, the dress code is relaxed as announced.

3. ID Card Rules
Every student must carry their college photo ID card on campus at all times. Failure to produce the ID card when requested by faculty or security may result in:
- Warning for first offense.
- Fine of Rs. 100/- for repeated offenses.
Replacement ID cards cost Rs. 200/-.

4. Mobile Phone Policy
Mobile phones are not permitted inside classrooms, laboratories, or examination halls. Phones must be switched off or on silent mode in the library. Violation may result in confiscation for 48 hours.

5. Social Media Policy
Students must not post content on social media that:
- Defames the institution or its members.
- Contains misinformation about the college.
- Promotes violence, hatred, or discrimination.
Violation of this policy is subject to disciplinary action.`,
        },
        {
          page: 2,
          content: `PLACEMENT GUIDELINES

1. Placement Cell
The Training and Placement Cell (TPC) coordinates campus recruitment activities. All final-year students are eligible to register for placement.

2. Eligibility for Campus Placements
To be eligible for campus recruitment, students must:
- Have a minimum CGPA of 6.0 (or as specified by the recruiting company).
- Have cleared all backlogs (no active failing grades) by the time of placement season.
- Have completed all required semesters by the time of joining the company.
- Have no active disciplinary action against them.

3. Registration for Placements
Students must register on the TPC Portal by the end of the 7th semester. Unregistered students will not receive placement notifications.

4. Interview Conduct
Students must attend pre-placement talks, aptitude tests, and interviews as scheduled. Failure to attend after confirming participation (without valid reason) will result in suspension from placement activities for that company's process.

5. Offer Acceptance Policy
Once a student accepts an offer letter, they are generally not allowed to participate in further campus recruitment drives (except for dream companies, as announced by TPC). Students must inform TPC within 3 days of receiving an offer.

6. Placement Statistics
The TPC publishes annual placement statistics including: number of companies visited, offers made, average CTC, highest CTC, and sector-wise distribution. This data is available on the college website.`,
        },
      ],
    },
  ];

  // Insert documents and chunks
  const insertDoc = db.prepare(`
    INSERT INTO documents (id, kb_id, file_name, file_type, file_size, file_path, status, page_count, chunk_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?)
  `);

  const insertChunk = db.prepare(`
    INSERT INTO document_chunks (id, doc_id, chunk_index, content, page_number, token_count, embedding, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const doc of demoDocuments) {
      const docId = uuidv4();
      const maxPage = Math.max(...doc.chunks.map(c => c.page));
      insertDoc.run(
        docId, kbId, doc.name, doc.type,
        doc.chunks.reduce((s, c) => s + c.content.length, 0),
        '',
        maxPage,
        doc.chunks.length,
        now, now
      );

      doc.chunks.forEach((chunk, idx) => {
        const chunkId = uuidv4();
        // Generate a simple keyword-based pseudo-embedding for demo mode
        const embedding = generateKeywordEmbedding(chunk.content);
        insertChunk.run(
          chunkId, docId, idx,
          chunk.content,
          chunk.page,
          Math.ceil(chunk.content.length / 4),
          JSON.stringify(embedding),
          now
        );
      });
    }
  });

  insertAll();
  console.log(`✓ Demo knowledge base seeded with ${demoDocuments.length} documents`);
}

/**
 * Generates a simple 128-dimensional pseudo-embedding based on keyword frequencies.
 * Used as fallback when OpenAI API is not configured.
 * This enables basic semantic search without any external API calls.
 */
export function generateKeywordEmbedding(text: string): number[] {
  const DIM = 128;
  const vector = new Array(DIM).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

  for (const word of words) {
    // Simple hash to map word → dimension
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) >>> 0;
    }
    const dim = hash % DIM;
    const dim2 = (hash >> 7) % DIM;
    vector[dim] += 1;
    if (dim2 !== dim) vector[dim2] += 0.5;
  }

  // L2 normalize
  const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
  if (magnitude > 0) {
    return vector.map(v => v / magnitude);
  }
  return vector;
}
