const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const sadMovies = [
    { vi: ['Hôn Lễ Của Em', 'Hon Le Cua Em'], en: ['My Love', 'My Wedding Day'], year: 2021 },
    { vi: ['Josée', 'Josee', 'Nàng Thơ Của Tôi', 'Josee Nang Tho'], en: ['Josee', 'Tiger and the Fish'], year: 2019 },
    { vi: ['Điều Ba Mẹ Không Kể', 'Dieu Ba Me Khong Ke'], en: ['Romang'], year: 2019 },
    { vi: ['Bi Thương Ngược Dòng Sông', 'Bi Thuong Nguoc Dong Song'], en: ['Cry Me A Sad River', 'Sad River'], year: 2018 },
    { vi: ['Ngày Em Đẹp Nhất', 'Ngay Em Dep Nhat'], en: ['On Your Wedding Day'], year: 2018 },
    { vi: ['Chúng Ta Sau Này', 'Chung Ta Sau Nay', 'Chúng Ta Của Sau Này'], en: ['Us and Them', 'Us & Them'], year: 2018 },
    { vi: ['Vì Sao Vụt Sáng', 'Vi Sao Vut Sang'], en: ['A Star Is Born', 'A Star is Born'], year: 2018 },
    { vi: ['Gọi Tên Anh Bằng Tên Của Em', 'Goi Em Bang Ten Anh', 'Gọi Em Bằng Tên Anh'], en: ['Call Me By Your Name', 'Call Me by Your Name'], year: 2017 },
    { vi: ['Trước Ngày Em Đến', 'Truoc Ngay Em Den', 'Mẹ Trước Khi Yêu'], en: ['Me Before You'], year: 2016 },
    { vi: ['Mẹ Ơi Đừng Khóc', 'Me Oi Dung Khoc'], en: ["Don't Cry Mommy", 'Dont Cry Mommy'], year: 2012 },
    { vi: ['Chuyện Tình Cây Táo Gai', 'Chuyen Tinh Cay Tao Gai', 'Táo Gai'], en: ['Under the Hawthorn Tree', 'Hawthorn Tree Forever'], year: 2010 },
    { vi: ['Mãi Đừng Xa Tôi', 'Mai Dung Xa Toi'], en: ['Never Let Me Go'], year: 2010 },
    { vi: ['Mong Em Hạnh Phúc', 'Mong Em Hanh Phuc', 'Hơn Cả Màu Xanh'], en: ['More Than Blue'], year: 2009 },
    { vi: ['Bước Ngoặt Đáng Nhớ', 'Buoc Ngoat Dang Nho'], en: ['A Walk to Remember'], year: 2002 },
    { vi: ['Con Trai Không Khóc', 'Con Trai Khong Khoc'], en: ["Boys Don't Cry", 'Boys Dont Cry'], year: 1999 },
    { vi: ['Hồn Ma', 'Hồn ma', 'Hon Ma'], en: ['Ghost'], year: 1990 },
    { vi: ['Cuộc Đời Forrest Gump', 'Forrest Gump'], en: ['Forrest Gump'], year: 1994 },
    { vi: ['Titanic'], en: ['Titanic'], year: 1997 },
    { vi: ['Mộ Đom Đóm', 'Mo Dom Dom', 'Nghĩa Địa Đom Đóm'], en: ['Grave of the Fireflies', 'Hotaru no Haka'], year: 1988 },
    { vi: ['Chuyện Tình Sau Núi', 'Chuyen Tinh Sau Nui'], en: ['Brokeback Mountain'], year: 2005 },
    { vi: ['Chuộc Lỗi', 'Chuoc Loi', 'Chuộc Tội'], en: ['Atonement'], year: 2007 },
    { vi: ['Một Ngày', 'Mot Ngay', 'Một Ngày Của Chúng Ta'], en: ['One Day'], year: 2011 },
    { vi: ['Lỗi Của Những Vì Sao', 'Loi Cua Nhung Vi Sao'], en: ['The Fault in Our Stars', 'Fault in Our Stars'], year: 2014 },
    { vi: ['5 Bước Để Yêu', '5 Buoc De Yeu', 'Năm Bước Để Yêu'], en: ['Five Feet Apart'], year: 2019 },
    // --- Thêm mới ---
    { vi: ['Đông Cung', 'Dong Cung'], en: ['Ancient Love Poetry', 'East Palace'], year: 2019 },
    { vi: ['Hôn Lễ Của Em', 'Hon Le Cua Em'], en: ['My Wedding Day'], year: 2021 },
    { vi: ['Trường An Như Cố', 'Truong An Nhu Co'], en: ["I'll See You Soon", 'Chang An Ru Gu'], year: 2021 },
    { vi: ['Điều Kỳ Diệu Ở Phòng Giam Số 7', 'Dieu Ky Dieu O Phong Giam So 7'], en: ['Miracle in Cell No. 7'], year: 2013 },
    { vi: ['Người Tình Ánh Trăng', 'Nguoi Tinh Anh Trang'], en: ['Moon Lovers', 'Moon Lovers: Scarlet Heart Ryeo'], year: 2016 },
    { vi: ['Khi Cuộc Đời Cho Bạn Quá Quýt', 'Khi Cuoc Doi Cho Ban Qua Quyt'], en: ['When Life Gives You Tangerines'], year: 2025 },
];

const checkDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pchill');
        const Movie = require('./models/Movie');

        console.log('=== Tìm kiếm phim buồn trong DB ===\n');
        const found = [];
        const missing = [];

        for (const m of sadMovies) {
            let movie = null;

            // Try each name variant
            for (const name of [...m.vi, ...m.en]) {
                const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                movie = await Movie.findOne({
                    $or: [
                        { name: { $regex: escaped, $options: 'i' } },
                        { origin_name: { $regex: escaped, $options: 'i' } },
                    ]
                }).select('name origin_name slug year').lean();
                if (movie) break;
            }

            const label = m.vi[0];
            if (movie) {
                found.push({ ...movie, searchedFor: label });
                console.log(`[FOUND] ${label} -> "${movie.name}" (${movie.year}) [${movie.slug}]`);
            } else {
                missing.push({ vi: label, en: m.en[0], year: m.year });
                console.log(`[MISSING] ${label} (${m.year})`);
            }
        }

        console.log(`\n=== Kết quả: ${found.length} found, ${missing.length} missing ===`);

        const fs = require('fs');
        fs.writeFileSync('sad_movies_results2.json', JSON.stringify({ found, missing }, null, 2));
        console.log('Saved -> sad_movies_results2.json');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkDB();
