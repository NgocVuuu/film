/**
 * seed_comments.js
 *
 * Chạy với --dry-run (mặc định) để xem preview trước khi insert.
 * Chạy với --run để thực sự insert vào DB.
 *
 * Usage:
 *   node scripts/seed_comments.js           ← preview (dry run)
 *   node scripts/seed_comments.js --run     ← insert thật
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const User    = require('../models/User');
const Movie   = require('../models/Movie');

const DRY_RUN = !process.argv.includes('--run');

// ── Bình luận seed (slug thực tế từ DB) ──────────────────────────────────────
const SEED_COMMENTS = [
    // ── Phim quốc tế ─────────────────────────────────────────────────────────
    { movieSlug: 'avengers-endgame',                  content: 'coi xong ngồi im 5 phút không nói được gì',             rating: 10 },
    { movieSlug: 'avengers-endgame',                  content: 'cảnh cuối hay vãi, xem mấy lần rồi vẫn xem lại được',  rating: 10 },
    { movieSlug: 'john-wick-chapter-4',               content: 'đánh nhau nhiều mà vẫn không chán, lạ thật',            rating: 9  },
    { movieSlug: 'john-wick-chapter-4',               content: 'thằng wick này chắc uống thuốc bất tử rồi',             rating: 8  },
    { movieSlug: 'interstellar',                      content: 'xem lần 2 mới hiểu sơ sơ, lần đầu ngồi ngáo cả',      rating: 10 },
    { movieSlug: 'parasite',                          content: 'twist cuối không ai đoán được, phục thật sự',           rating: 10 },
    { movieSlug: 'parasite',                          content: 'phim hàn mà hay cỡ này, oscar xứng đáng 100%',          rating: 10 },
    { movieSlug: 'the-shawshank-redemption',          content: 'xem rồi mới hiểu sao nó top imdb, không oan',           rating: 10 },
    { movieSlug: 'your-name',                         content: 'không xem anime mà xem cái này vẫn khóc được',          rating: 10 },
    { movieSlug: 'la-la-land',                        content: 'cái kết đó sao lại vậy, đau lòng thật sự',              rating: 10 },
    { movieSlug: 'the-conjuring',                     content: 'xem lúc 12h đêm một mình, sai lầm cả đời',              rating: 9  },
    { movieSlug: 'knives-out',                        content: 'đoán sai từ đầu đến cuối, phim hay kiểu này hiếm',      rating: 9  },
    { movieSlug: 'forrest-gump',                      content: 'nhẹ nhàng mà ngấm, xem xong cảm thấy khác',             rating: 10 },
    { movieSlug: 'the-grand-budapest-hotel',          content: 'màu sắc đẹp điên, kiểu phim xem cho mắt cũng được',    rating: 9  },
    { movieSlug: 'superbad',                          content: 'tụi nhỏ trong phim bậy mà vẫn thấy thương',             rating: 8  },

    // ── Hàn Quốc 2016 ────────────────────────────────────────────────────────
    { movieSlug: 'hau-due-mat-troi',                  content: 'xem hồi đó không ngủ được mấy đêm, ghiền thật sự',     rating: 10 },
    { movieSlug: 'hau-due-mat-troi',                  content: 'song joong ki lúc này đẹp trai quá, hiểu sao mọi người mê', rating: 9 },
    { movieSlug: 'hau-due-mat-troi',                  content: 'phim hay mà cảnh quay cũng đẹp, xem lại vẫn được',     rating: 9  },
    { movieSlug: 'co-nang-cu-ta-kim-bok-joo',         content: 'phim nhẹ nhàng dễ thương, xem không bị nặng đầu',      rating: 8  },
    { movieSlug: 'co-nang-cu-ta-kim-bok-joo',         content: 'couple này cute lắm, xem vui phết',                    rating: 8  },
    { movieSlug: 'chuyen-tinh-bac-si',                content: 'phim bệnh viện mà không nhàm, xem được lắm',           rating: 8  },
    { movieSlug: 'nguoi-tinh-anh-trang',              content: 'phong cảnh đẹp, cốt truyện hơi sến nhưng vẫn xem',    rating: 7  },
    { movieSlug: 'nguoi-tu-te',                       content: 'phim này ít người biết nhưng xem xong nhớ mãi',        rating: 9  },
    { movieSlug: 'mat-danh-k2',                       content: 'chemistry hai người chính ngon, mấy cảnh action cũng ổn', rating: 8 },
    { movieSlug: 'bay-tinh-yeu',                      content: 'xem hồi đó thấy hay lắm, giờ nghĩ lại vẫn nhớ',       rating: 8  },
    { movieSlug: 'lo-lem-va-bon-chang-hiep-si',       content: 'plot hơi cũ nhưng diễn viên dễ thương nên xem được',   rating: 7  },

    // ── Hàn Quốc 2025-2026 ───────────────────────────────────────────────────
    { movieSlug: 'con-say-mua-xuan',                  content: 'phim ngắn mà ý nghĩa, xem một lèo là hết',             rating: 9  },
    { movieSlug: 'trao-em-ca-vu-tru',                 content: 'đang xem dở, hóng tập mới mỗi tuần mệt quá',           rating: 8  },
    { movieSlug: 'lieu-thuoc-cho-tinh-yeu',           content: 'hai nhân vật chính cute, xem thư giãn tốt',            rating: 8  },
    { movieSlug: 'danh-du-cuoi-cung',                 content: 'phim tòa án mà căng, xem không dám bỏ tập nào',        rating: 9  },
    { movieSlug: 'thuy-trieu-tinh-yeu-phan-2',        content: 'phần 2 hay hơn phần 1 một chút, vẫn đang hóng',        rating: 8  },
    { movieSlug: 'dia-nguc-doc-than-phan-5',          content: 'coi chơi thôi nhưng mấy anh đẹp trai thật',            rating: 7  },
    { movieSlug: 'tu-hom-nay-toi-la-con-nguoi',       content: 'concept lạ mà hay, nhân vật chính diễn tốt',           rating: 8  },
    { movieSlug: 'ten-trom-dau-yeu',                  content: 'xem tạm được, không quá hay không quá dở',             rating: 7  },

    // ── Trung Quốc 2025-2026 ─────────────────────────────────────────────────
    { movieSlug: 'sac-dem-ngap-tran',                 content: 'phim c thì cảnh quay đẹp là cái chắc rồi',             rating: 8  },
    { movieSlug: 'thai-binh-nien',                    content: 'sử thi mà dài, nhưng xem không bị chán mấy',           rating: 8  },
    { movieSlug: 'thanh-xuan-tro-lai',                content: 'phim idol nhẹ nhàng, xem cho vui cuối tuần',           rating: 7  },
    { movieSlug: 'co-ay-that-ruc-ro',                 content: 'nữ chính đáng yêu, plot đơn giản nhưng xem được',      rating: 7  },
    { movieSlug: 'tuyet-thu-tran-sang-dong',          content: 'cổ trang mà không nhàm, tạo hình đẹp lắm',             rating: 8  },
    { movieSlug: 'goc-toi',                           content: 'tối và nặng nề nhưng diễn xuất tốt, xem thử đi',       rating: 8  },
    { movieSlug: 'con-ra-the-thong-gi-nua',           content: 'hài hơi nhảm nhưng vẫn cười được, xem giải trí ổn',   rating: 7  },
    { movieSlug: 'duong-quy-ky-an',                   content: 'phim phá án kiểu trung thì xem ổn, không quá dở',      rating: 7  },

    // ── Sad movie / Hàn drama tâm lý ─────────────────────────────────────────
    { movieSlug: 'con-bao-tuoi-doi-muoi',             content: 'xem xong nhớ hồi còn trẻ, buồn cười thật',            rating: 9  },
    { movieSlug: 'moi-tinh-ngang-trai',               content: 'cốt truyện cũ nhưng diễn viên diễn nuốt hết',         rating: 8  },
    { movieSlug: 'muon-kiep-nhan-duyen',              content: 'phim dài mà không thấy chán, xem bị cuốn luôn',       rating: 9  },
    { movieSlug: 'xe-cong-nong-tinh-yeu',             content: 'vùng quê hàn mà lãng mạn thật, xem thấy dễ chịu',    rating: 8  },

    // ── Tiếng Yêu Này Anh Dịch Được Không (2026) ─────────────────────────────
    { movieSlug: 'tieng-yeu-nay-anh-dich-duoc-khong', content: 'couple này cute thật, xem vừa cười vừa ngượng theo',  rating: 9  },
    { movieSlug: 'tieng-yeu-nay-anh-dich-duoc-khong', content: 'tên phim hay mà nội dung cũng không phụ lòng',        rating: 9  },
    { movieSlug: 'tieng-yeu-nay-anh-dich-duoc-khong', content: 'xem xong muốn có người dịch tiếng yêu cho mình quá', rating: 10 },
    { movieSlug: 'tieng-yeu-nay-anh-dich-duoc-khong', content: 'nhẹ nhàng dễ chịu, xem một lèo là hết không hay',    rating: 8  },
    { movieSlug: 'tieng-yeu-nay-anh-dich-duoc-khong', content: 'nữ chính đáng yêu lắm, nam chính cũng không vừa',    rating: 9  },
];

// ── Fake users: tên casual, không đặt tên chuẩn ────────────────────────────────
const FAKE_USERS = [
    { displayName: 'tuan98',        avatar: 'https://ui-avatars.com/api/?name=tuan98&background=3b82f6&color=fff'        },
    { displayName: 'lananh_iu',     avatar: 'https://ui-avatars.com/api/?name=lananh&background=ec4899&color=fff'       },
    { displayName: 'hungbi2k',      avatar: 'https://ui-avatars.com/api/?name=hungbi&background=f59e0b&color=fff'       },
    { displayName: 'vy.thao',       avatar: 'https://ui-avatars.com/api/?name=vy&background=10b981&color=fff'           },
    { displayName: 'qdai_movie',    avatar: 'https://ui-avatars.com/api/?name=qdai&background=8b5cf6&color=fff'         },
    { displayName: 'nhoc_han',      avatar: 'https://ui-avatars.com/api/?name=han&background=ef4444&color=fff'          },
    { displayName: 'baolong99',     avatar: 'https://ui-avatars.com/api/?name=blong&background=06b6d4&color=fff'        },
    { displayName: 'thuha.watch',   avatar: 'https://ui-avatars.com/api/?name=thuha&background=f97316&color=fff'        },
    { displayName: 'dungdz',        avatar: 'https://ui-avatars.com/api/?name=dung&background=84cc16&color=fff'         },
    { displayName: 'mai.linh01',    avatar: 'https://ui-avatars.com/api/?name=mlinh&background=6366f1&color=fff'        },
    { displayName: 'khanh.dep.trai', avatar: 'https://ui-avatars.com/api/?name=khanh&background=0ea5e9&color=fff'       },
    { displayName: 'hieu_phim',     avatar: 'https://ui-avatars.com/api/?name=hieu&background=a855f7&color=fff'         },
    { displayName: 'nguyenkute',    avatar: 'https://ui-avatars.com/api/?name=nguyen&background=14b8a6&color=fff'       },
    { displayName: 'trangtv_',      avatar: 'https://ui-avatars.com/api/?name=trang&background=f43f5e&color=fff'        },
    { displayName: 'phim.fanatic',  avatar: 'https://ui-avatars.com/api/?name=fanatic&background=78716c&color=fff'      },
    { displayName: 'binhhh2003',    avatar: 'https://ui-avatars.com/api/?name=binh&background=f59e0b&color=fff'         },
    { displayName: 'long.movie',    avatar: 'https://ui-avatars.com/api/?name=long&background=22c55e&color=fff'         },
    { displayName: 'nhunguyen_',    avatar: 'https://ui-avatars.com/api/?name=nhu&background=e879f9&color=fff'          },
    { displayName: 'cuong.xem',     avatar: 'https://ui-avatars.com/api/?name=cuong&background=fb923c&color=fff'        },
    { displayName: 'meocon.phim',   avatar: 'https://ui-avatars.com/api/?name=meo&background=38bdf8&color=fff'          },
];

// Spread ngày tạo ngẫu nhiên trong vòng 1 tháng gần đây
function randomDate() {
    const now = Date.now();
    const oneMonthMs = 30 * 24 * 60 * 60 * 1000;
    return new Date(now - Math.random() * oneMonthMs);
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Kết nối MongoDB thành công\n');

    // 1. Validate: kiểm tra slug có tồn tại trong DB không
    const slugsNeeded = [...new Set(SEED_COMMENTS.map(c => c.movieSlug))];
    const foundMovies = await Movie.find({ slug: { $in: slugsNeeded } }).select('slug name').lean();
    const foundSlugs  = new Set(foundMovies.map(m => m.slug));
    const missingSlug = slugsNeeded.filter(s => !foundSlugs.has(s));

    if (missingSlug.length > 0) {
        console.warn('⚠️  Các slug KHÔNG tìm thấy trong DB (sẽ bỏ qua):');
        missingSlug.forEach(s => console.warn(`   ✗ ${s}`));
        console.log('');
    }

    const validComments = SEED_COMMENTS.filter(c => foundSlugs.has(c.movieSlug));

    // 2. Preview
    console.log(`📋 Preview ${validComments.length}/${SEED_COMMENTS.length} bình luận hợp lệ:\n`);
    validComments.forEach((c, i) => {
        const movie = foundMovies.find(m => m.slug === c.movieSlug);
        console.log(`${String(i + 1).padStart(2, '0')}. [${movie?.name || c.movieSlug}] ⭐${c.rating}`);
        console.log(`    "${c.content}"`);
        console.log('');
    });

    if (DRY_RUN) {
        console.log('━'.repeat(60));
        console.log('🔍 DRY RUN — không có gì được insert.');
        console.log('   Để insert thật: node scripts/seed_comments.js --run');
        await mongoose.disconnect();
        return;
    }

    // 3. Insert thật
    console.log('🚀 Bắt đầu insert...\n');

    // Tạo fake users (upsert theo displayName để idempotent)
    const fakeUserDocs = [];
    for (const fu of FAKE_USERS) {
        let u = await User.findOne({ email: `seed_${fu.displayName.toLowerCase().replace(/[\s.]/g, '_')}@pchill.seed` });
        if (!u) {
            u = await User.create({
                displayName: fu.displayName,
                avatar: fu.avatar,
                role: 'user',
                email: `seed_${fu.displayName.toLowerCase().replace(/[\s.]/g, '_')}@pchill.seed`,
            });
            console.log(`  👤 Tạo user: ${fu.displayName}`);
        } else {
            console.log(`  👤 User đã tồn tại: ${fu.displayName}`);
        }
        fakeUserDocs.push(u);
    }

    console.log('');
    let inserted = 0;
    for (const c of validComments) {
        const user = fakeUserDocs[Math.floor(Math.random() * fakeUserDocs.length)];
        const doc = await Comment.create({
            user:        user._id,
            movieSlug:   c.movieSlug,
            content:     c.content,
            rating:      c.rating,
            episodeName: c.episodeName || null,
            parentId:    null,
            likes:       [],
            isHidden:    false,
            createdAt:   randomDate(),
        });
        console.log(`  ✅ [${c.movieSlug}] "${c.content.slice(0, 40)}..." — user: ${user.displayName}`);
        inserted++;
    }

    console.log(`\n🎉 Done! Đã insert ${inserted} bình luận.`);
    await mongoose.disconnect();
}

main().catch(err => {
    console.error('❌ Lỗi:', err.message);
    process.exit(1);
});
