import logoImg from '../assets/images/padmawijaya_logo_1794834068473.jpg';
import heroImg from '../assets/images/padmawijaya_hero_photo_1794834074828.jpg';
import ldksImg from '../assets/images/padmawijaya_activity_ldks_1794834070721.jpg';
import eventImg from '../assets/images/padmawijaya_activity_event_1794834070917.jpg';
import {
  WebsiteSettings,
  MusicOperatingConfig,
  IntegrationSettings,
  Division,
  Position,
  PublicMemberRecord,
  AnnouncementItem,
  ProgramWork,
  DutySchedule,
  CalendarEvent,
  GalleryAlbum,
  GalleryItem,
  JourneyItem,
  ArchiveDocument,
  MusicTrack,
} from '../types';

export const DEFAULT_LOGO_IMAGE = logoImg;
export const DEFAULT_HERO_IMAGE = heroImg;
export const DEFAULT_LDKS_IMAGE = ldksImg;
export const DEFAULT_EVENT_IMAGE = eventImg;

export const GOOGLE_DRIVE_FOLDER_ID_CONST = '1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ';
export const GOOGLE_DRIVE_FOLDER_URL_CONST =
  'https://drive.google.com/drive/folders/1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ';

export const INITIAL_WEBSITE_SETTINGS: WebsiteSettings = {
  organizationName: 'PADMAWIJAYA',
  organizationType: 'OSIS',
  period: '2026/2027',
  tagline: 'Berintegritas, Kolaboratif, dan Inovatif untuk Kemajuan Siswa',
  introduction:
    'PADMAWIJAYA 2026/2027 adalah Organisasi Siswa Intra Sekolah (OSIS) yang hadir sebagai wadah aspirasi, kepemimpinan, kreativitas, dan pengabdian seluruh peserta didik. Melalui tata kelola organisasi yang modern dan transparan, kami berkomitmen menghadirkan program kerja nyata dan berdampak bagi lingkungan sekolah.',
  vision:
    'Mewujudkan OSIS PADMAWIJAYA 2026/2027 sebagai organisasi siswa yang berkarakter unggul, demokratis, adaptif terhadap perkembangan zaman, serta menjadi penggerak prestasi dan harmoni seluruh warga sekolah.',
  mission:
    '1. Menyelenggarakan tata kelola organisasi berbasis transparansi digital dan kedisiplinan pengurus.\n2. Menampung serta menindaklanjuti aspirasi siswa secara konstruktif bersama pihak sekolah.\n3. Mengembangkan potensi akademik, seni, olahraga, dan kepemimpinan melalui program kerja terukur.\n4. Membangun budaya sekolah yang inklusif, peduli lingkungan, dan berakhlak mulia.',
  history:
    'Nama PADMAWIJAYA berasal dari perpaduan kata "Padma" yang melambangkan kemurnian niat dan pertumbuhan di berbagai kondisi, serta "Wijaya" yang berarti kemenangan dan keunggulan dalam berkarya. Kepengurusan periode 2026/2027 dibentuk melalui rangkaian seleksi terbuka, Latihan Dasar Kepemimpinan Siswa (LDKS), hingga pelantikan resmi sebagai penerus tongkat estafet organisasi siswa.',
  goals:
    'Meningkatkan partisipasi aktif siswa dalam kegiatan kesiswaan, memperkuat sinergi antarseksi bidang (Sekbid), serta menghadirkan dokumentasi arsip dan absensi kepengurusan yang tertib dan akuntabel.',
  logoUrl: logoImg,
  heroImageUrl: heroImg,
  email: 'osis.padmawijaya@sekolah.sch.id',
  phone: '+62 812-0000-2026',
  address: 'Ruang Sekretariat OSIS, Gedung Kesiswaan Lt. 1',
  instagramUrl: 'https://instagram.com',
  tiktokUrl: 'https://tiktok.com',
  youtubeUrl: 'https://youtube.com',
  defaultTheme: 'light',
  musicEnabled: true,
};

export const INITIAL_MUSIC_CONFIG: MusicOperatingConfig = {
  requestsEnabled: true,
  manualOverride: 'AUTO',
  openTimeWib: '09:30',
  closeTimeWib: '10:00',
  secondWindowOpenWib: '12:00',
  secondWindowCloseWib: '12:45',
  maxRequestsPerHourPerClient: 3,
  showPublicDisplay: true,
  noticeText:
    'Layanan Music Request dibuka pada jam istirahat sekolah (09:30–10:00 WIB dan 12:00–12:45 WIB) atau saat diaktifkan oleh Admin Sekbid Media.',
};

export const INITIAL_INTEGRATION_SETTINGS: IntegrationSettings = {
  googleDriveFolderId: GOOGLE_DRIVE_FOLDER_ID_CONST,
  googleDriveFolderUrl: GOOGLE_DRIVE_FOLDER_URL_CONST,
  googleSheetsSpreadsheetId: '',
  googleSheetsRange: 'Absensi!A:I',
  autoSyncAttendanceToSheets: true,
};

export const INITIAL_DIVISIONS: Division[] = [
  { id: 'bph', name: 'Badan Pengurus Harian (BPH)', code: 'BPH', description: 'Pimpinan inti koordinasi kebijakan, administrasi, dan keuangan organisasi.', order: 1 },
  { id: 'sekbid-1', name: 'Sekbid 1 — Keimanan & Ketakwaan', code: 'SB-01', description: 'Pembinaan kegiatan keagamaan, toleransi, dan peringatan hari besar keagamaan.', order: 2 },
  { id: 'sekbid-2', name: 'Sekbid 2 — Budi Pekerti & Akhlak Mulia', code: 'SB-02', description: 'Penegakan tata tertib siswa, piket gerbang, dan budaya 5S.', order: 3 },
  { id: 'sekbid-3', name: 'Sekbid 3 — Kepribadian & Bela Negara', code: 'SB-03', description: 'Tata upacara bendera, kedisiplinan, dan pembinaan karakter kebangsaan.', order: 4 },
  { id: 'sekbid-4', name: 'Sekbid 4 — Prestasi Akademik, Seni & Olahraga', code: 'SB-04', description: 'Penyelenggaraan classmeeting, kompetisi bakat, dan festival sekolah.', order: 5 },
  { id: 'sekbid-5', name: 'Sekbid 5 — Demokrasi, HAM & Kepemimpinan', code: 'SB-05', description: 'LDKS, kaderisasi kepengurusan, dan forum aspirasi siswa.', order: 6 },
  { id: 'sekbid-6', name: 'Sekbid 6 — Kreativitas & Kewirausahaan', code: 'SB-06', description: 'Bazar siswa, unit usaha kreatif OSIS, dan pelatihan kewirausahaan.', order: 7 },
  { id: 'sekbid-7', name: 'Sekbid 7 — Kualitas Jasmani, Kesehatan & Gizi', code: 'SB-07', description: 'Program UKS, kampanye hidup sehat, dan aksi kepedulian lingkungan.', order: 8 },
  { id: 'sekbid-8', name: 'Sekbid 8 — Sastra, Budaya & Publikasi Digital', code: 'SB-08', description: 'Dokumentasi media, majalah dinding, siaran musik sekolah, dan informasi publik.', order: 9 },
];

export const INITIAL_POSITIONS: Position[] = [
  { id: 'pos-ketua', title: 'Ketua OSIS', order: 1 },
  { id: 'pos-wakil', title: 'Wakil Ketua OSIS', order: 2 },
  { id: 'pos-sekretaris', title: 'Sekretaris Umum', order: 3 },
  { id: 'pos-bendahara', title: 'Bendahara Umum', order: 4 },
  { id: 'pos-koord', title: 'Koordinator Sekbid', order: 5 },
  { id: 'pos-anggota', title: 'Anggota Sekbid', order: 6 },
];

export const INITIAL_PUBLIC_MEMBERS: PublicMemberRecord[] = [
  {
    id: 'placeholder-ketua',
    fullName: '[Nama Ketua OSIS — Edit di Panel Admin]',
    divisionId: 'bph',
    divisionName: 'Badan Pengurus Harian (BPH)',
    positionTitle: 'Ketua OSIS',
    hierarchyRank: 1,
    bio: 'Bertanggung jawab memimpin koordinasi seluruh program kerja PADMAWIJAYA 2026/2027.',
    photoUrl: '',
    isPublished: true,
  },
  {
    id: 'placeholder-wakil',
    fullName: '[Nama Wakil Ketua OSIS — Edit di Panel Admin]',
    divisionId: 'bph',
    divisionName: 'Badan Pengurus Harian (BPH)',
    positionTitle: 'Wakil Ketua OSIS',
    hierarchyRank: 2,
    bio: 'Mendampingi Ketua OSIS dan mengawasi pelaksanaan operasional setiap Sekbid.',
    photoUrl: '',
    isPublished: true,
  },
  {
    id: 'placeholder-sekretaris',
    fullName: '[Nama Sekretaris Umum — Edit di Panel Admin]',
    divisionId: 'bph',
    divisionName: 'Badan Pengurus Harian (BPH)',
    positionTitle: 'Sekretaris Umum',
    hierarchyRank: 3,
    bio: 'Mengelola surat-menyurat, notulensi rapat, proposal, serta arsip organisasi.',
    photoUrl: '',
    isPublished: true,
  },
  {
    id: 'placeholder-bendahara',
    fullName: '[Nama Bendahara Umum — Edit di Panel Admin]',
    divisionId: 'bph',
    divisionName: 'Badan Pengurus Harian (BPH)',
    positionTitle: 'Bendahara Umum',
    hierarchyRank: 4,
    bio: 'Mengelola anggaran kas organisasi dan laporan pertanggungjawaban keuangan.',
    photoUrl: '',
    isPublished: true,
  },
  {
    id: 'placeholder-sb2',
    fullName: '[Koordinator Sekbid 2 — Edit di Panel Admin]',
    divisionId: 'sekbid-2',
    divisionName: 'Sekbid 2 — Budi Pekerti & Akhlak Mulia',
    positionTitle: 'Koordinator Sekbid',
    hierarchyRank: 5,
    bio: 'Koordinator piket penyambutan gerbang pagi (06:30 WIB) dan pembinaan kedisiplinan.',
    photoUrl: '',
    isPublished: true,
  },
  {
    id: 'placeholder-sb8',
    fullName: '[Koordinator Sekbid 8 — Edit di Panel Admin]',
    divisionId: 'sekbid-8',
    divisionName: 'Sekbid 8 — Sastra, Budaya & Publikasi Digital',
    positionTitle: 'Koordinator Sekbid',
    hierarchyRank: 5,
    bio: 'Mengelola dokumentasi kegiatan, galeri publik, dan layanan Music Request sekolah.',
    photoUrl: '',
    isPublished: true,
  },
];

export const INITIAL_DUTY_SCHEDULES: DutySchedule[] = [
  {
    id: 'piket-gerbang-pagi',
    name: 'Piket Gerbang Pagi (Default)',
    dutyTimeWib: '06:30',
    windowOpenWib: '05:30',
    windowCloseWib: '08:00',
    graceMinutes: 5,
    isActive: true,
  },
];

export const INITIAL_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Peluncuran Portal Resmi & Sistem Manajemen PADMAWIJAYA 2026/2027',
    description:
      'Selamat datang di portal resmi OSIS PADMAWIJAYA periode 2026/2027. Seluruh informasi program kerja, kalender kegiatan, arsip dokumen publik, serta fitur Music Request kini tersedia secara terpadu. Pengurus juga dapat mengakses portal anggota untuk absensi piket gerbang pagi.',
    category: 'Important',
    author: 'BPH PADMAWIJAYA',
    publishedAt: '2026-11-16',
    imageUrl: heroImg,
    isPinned: true,
    published: true,
  },
  {
    id: 'ann-2',
    title: 'Jadwal Piket Penyambutan Gerbang Pagi Periode Semester Ganjil',
    description:
      'Seluruh pengurus yang terjadwal piket gerbang wajib hadir paling lambat pukul 06:30 WIB dan melakukan konfirmasi absensi melalui Dashboard Anggota dengan melampirkan swafoto dokumentasi.',
    category: 'Division Information',
    author: 'Sekbid 2 — Budi Pekerti',
    publishedAt: '2026-11-15',
    imageUrl: ldksImg,
    isPinned: false,
    published: true,
  },
  {
    id: 'ann-3',
    title: 'Rapat Koordinasi Persiapan Pekan Kreativitas & Seni Siswa',
    description:
      'Dimohon kehadiran perwakilan seluruh Sekbid dalam rapat koordinasi persiapan teknis acara festival seni dan classmeeting di ruang sekretariat OSIS.',
    category: 'Meeting',
    author: 'Sekretaris Umum',
    publishedAt: '2026-11-14',
    imageUrl: eventImg,
    isPinned: false,
    published: true,
  },
];

export const INITIAL_PROGRAMS: ProgramWork[] = [
  {
    id: 'prog-1',
    name: 'Latihan Dasar Kepemimpinan Siswa (LDKS) 2026',
    description:
      'Pembekalan manajerial, tata persuratan, komunikasi organisasi, dan pembentukan karakter pengurus baru PADMAWIJAYA 2026/2027.',
    divisionId: 'sekbid-5',
    divisionName: 'Sekbid 5 — Demokrasi, HAM & Kepemimpinan',
    personInCharge: 'Koordinator Sekbid 5',
    targetDate: '2026-10-24',
    status: 'SELESAI',
    progressNotes: 'Kegiatan terlaksana dengan baik diikuti seluruh calon pengurus inti dan anggota sekbid.',
    documentationUrl: ldksImg,
  },
  {
    id: 'prog-2',
    name: 'Piket Penyambutan Pagi & Gerakan 5S',
    description:
      'Program rutin penyambutan siswa di gerbang sekolah pukul 06:30 WIB untuk menumbuhkan kedisiplinan dan budaya salam sapa.',
    divisionId: 'sekbid-2',
    divisionName: 'Sekbid 2 — Budi Pekerti & Akhlak Mulia',
    personInCharge: 'Koordinator Sekbid 2',
    targetDate: '2027-06-15',
    status: 'SEDANG BERJALAN',
    progressNotes: 'Berjalan setiap hari Senin–Jumat dengan sistem absensi digital anggota.',
  },
  {
    id: 'prog-3',
    name: 'Festival Seni, Budaya & Music Request Sekolah',
    description:
      'Wadah ekspresi seni siswa, pameran karya kreatif, dan pengelolaan siaran musik jam istirahat secara tertib dan terkurasi.',
    divisionId: 'sekbid-8',
    divisionName: 'Sekbid 8 — Sastra, Budaya & Publikasi Digital',
    personInCharge: 'Koordinator Sekbid 8',
    targetDate: '2026-12-18',
    status: 'SEDANG BERJALAN',
    progressNotes: 'Sistem Music Request publik sudah aktif dan sedang dalam tahap kurasi jadwal istirahat.',
    documentationUrl: eventImg,
  },
  {
    id: 'prog-4',
    name: 'Pekan Olahraga & Classmeeting Semester Genap',
    description:
      'Turnamen antar kelas cabang olahraga dan e-sports edukatif sebagai penutup ujian akhir semester.',
    divisionId: 'sekbid-4',
    divisionName: 'Sekbid 4 — Prestasi Akademik, Seni & Olahraga',
    personInCharge: 'Koordinator Sekbid 4',
    targetDate: '2027-06-20',
    status: 'BELUM DIMULAI',
    progressNotes: 'Masih dalam penyusunan kerangka acuan kerja dan rancangan anggaran.',
  },
];

export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'evt-1',
    title: 'Rapat Pleno Evaluasi Triwulan I',
    date: '2026-11-21',
    time: '15:15 WIB',
    location: 'Aula Serbaguna Sekolah',
    organizer: 'BPH PADMAWIJAYA',
    divisionId: 'bph',
    category: 'Rapat',
    description: 'Evaluasi capaian program kerja awal periode serta sinkronisasi jadwal kegiatan akhir semester.',
    published: true,
  },
  {
    id: 'evt-2',
    title: 'Batas Pengumpulan Proposal Classmeeting',
    date: '2026-11-28',
    time: '16:00 WIB',
    location: 'Sekretariat OSIS',
    organizer: 'Sekbid 4',
    divisionId: 'sekbid-4',
    category: 'Deadline Proker',
    description: 'Penyerahan draf final proposal kegiatan dan rincian kebutuhan perlengkapan ke Sekretaris Umum.',
    published: true,
  },
  {
    id: 'evt-3',
    title: 'Pekan Kreativitas & Pentas Seni PADMAWIJAYA',
    date: '2026-12-18',
    time: '08:00 - 14:30 WIB',
    location: 'Lapangan Utama & Panggung Seni',
    organizer: 'Sekbid 4 & Sekbid 8',
    divisionId: 'sekbid-8',
    category: 'Event Besar',
    description: 'Pertunjukan seni tari, musik akustik siswa, bazar kewirausahaan, dan apresiasi prestasi siswa.',
    published: true,
  },
];

export const INITIAL_GALLERY_ALBUMS: GalleryAlbum[] = [
  {
    id: 'album-1',
    title: 'Pelantikan & Pembentukan Kabinet PADMAWIJAYA 2026/2027',
    description: 'Momen kebersamaan pengurus inti dan seluruh perwakilan seksi bidang setelah resmi dilantik.',
    publishedAt: '2026-10-15',
    coverUrl: heroImg,
    isPublished: true,
  },
  {
    id: 'album-2',
    title: 'Workshop Kepemimpinan & Rapat Kerja (LDKS)',
    description: 'Diskusi penyusunan program kerja strategis tiap divisi dalam forum kepemimpinan.',
    publishedAt: '2026-10-24',
    coverUrl: ldksImg,
    isPublished: true,
  },
  {
    id: 'album-3',
    title: 'Festival Seni & Apresiasi Budaya Siswa',
    description: 'Kolaborasi panitia OSIS dalam mempersiapkan panggung kreativitas seni dan budaya.',
    publishedAt: '2026-11-10',
    coverUrl: eventImg,
    isPublished: true,
  },
];

export const INITIAL_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gitem-1',
    albumId: 'album-1',
    mediaType: 'photo',
    url: heroImg,
    caption: 'Foto bersama jajaran pengurus OSIS PADMAWIJAYA 2026/2027 di halaman utama sekolah.',
    isPublished: true,
  },
  {
    id: 'gitem-2',
    albumId: 'album-2',
    mediaType: 'photo',
    url: ldksImg,
    caption: 'Sesi diskusi kelompok penyusunan program kerja antar seksi bidang.',
    isPublished: true,
  },
  {
    id: 'gitem-3',
    albumId: 'album-3',
    mediaType: 'photo',
    url: eventImg,
    caption: 'Koordinasi panitia di area panggung festival seni siswa.',
    isPublished: true,
  },
];

export const INITIAL_JOURNEY: JourneyItem[] = [
  {
    id: 'j-1',
    title: 'Pembentukan & Seleksi Bakal Calon Pengurus',
    phase: 'Pembentukan Awal',
    date: 'September 2026',
    description: 'Rangkaian seleksi administrasi, wawancara kepemimpinan, dan uji kelayakan calon pengurus OSIS periode 2026/2027.',
    imageUrl: ldksImg,
    order: 1,
  },
  {
    id: 'j-2',
    title: 'Pelantikan Resmi Kabinet PADMAWIJAYA 2026/2027',
    phase: 'Pelantikan',
    date: 'Oktober 2026',
    description: 'Serah terima jabatan dan pembacaan ikrar kepengurusan resmi di hadapan seluruh warga sekolah.',
    imageUrl: heroImg,
    order: 2,
  },
  {
    id: 'j-3',
    title: 'Rapat Kerja & Sinkronisasi Program Kerja',
    phase: 'Rapat Kerja',
    date: 'Oktober 2026',
    description: 'Penetapan matriks program kerja untuk delapan seksi bidang selama satu tahun masa bakti.',
    imageUrl: ldksImg,
    order: 3,
  },
  {
    id: 'j-4',
    title: 'Eksekusi Program Unggulan & Festival Siswa',
    phase: 'Kegiatan Organisasi',
    date: 'November 2026 — Berjalan',
    description: 'Pelaksanaan piket pagi digital, publikasi informasi siswa, serta persiapan festival seni tahunan.',
    imageUrl: eventImg,
    order: 4,
  },
];

export const INITIAL_DOCUMENTS: ArchiveDocument[] = [
  {
    id: 'doc-1',
    title: 'Pedoman Umum Program Kerja PADMAWIJAYA 2026/2027',
    category: 'Dokumen Publik',
    description: 'Ringkasan pedoman pelaksanaan kegiatan dan alur pengajuan aspirasi siswa.',
    visibility: 'public',
    fileUrl: 'https://drive.google.com/drive/folders/1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ',
    uploadedAt: '2026-10-25',
  },
  {
    id: 'doc-2',
    title: 'Template Proposal Kegiatan Ekstrakurikuler & Sekbid',
    category: 'Proposal',
    description: 'Format standar pengajuan proposal kegiatan siswa kepada BPH dan Pembina OSIS.',
    visibility: 'public',
    fileUrl: 'https://drive.google.com/drive/folders/1wbDKQg9NERyBeqEMXldgQxq-UZF6z0cQ',
    uploadedAt: '2026-11-02',
  },
];

export const INITIAL_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Mars Semangat Pelajar (Instrumental)',
    artist: 'Arsip Audio PADMAWIJAYA',
    audioUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Gong_1.ogg',
    isActive: true,
  },
];
