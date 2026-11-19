import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Clock,
  Smile,
  Users,
  Leaf,
  Utensils,
  Trophy,
  Plane,
  Lightbulb,
  Heart,
  Flag,
  X,
} from 'lucide-react';

interface SlackEmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

interface EmojiCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  emojis: { emoji: string; name: string; keywords: string[] }[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    name: 'Mặt cười & Cảm xúc',
    icon: Smile,
    emojis: [
      { emoji: '😀', name: 'Grinning', keywords: ['cuoi', 'happy', 'vui', 'smile'] },
      { emoji: '😃', name: 'Smiling', keywords: ['cuoi', 'smile', 'happy'] },
      { emoji: '😄', name: 'Smile with eyes', keywords: ['cuoi', 'mat hi', 'vui'] },
      { emoji: '😁', name: 'Beaming', keywords: ['nhe rang', 'grin', 'rang'] },
      { emoji: '😆', name: 'Grinning squinting', keywords: ['cuoi tit mat', 'khoai'] },
      { emoji: '😅', name: 'Sweat smile', keywords: ['do mo hoi', 'nguong', 'sweat'] },
      { emoji: '🤣', name: 'ROFL', keywords: ['cuoi lan bo', 'rofl', 'hai'] },
      { emoji: '😂', name: 'Tears of joy', keywords: ['cuoi ra nuoc mat', 'lol', 'vui'] },
      { emoji: '🙂', name: 'Slightly smile', keywords: ['mim cuoi', 'nhe nhang'] },
      { emoji: '🙃', name: 'Upside down', keywords: ['nguoc', 'sarcasm', 'nghich'] },
      { emoji: '😉', name: 'Wink', keywords: ['nhay mat', 'wink'] },
      { emoji: '😊', name: 'Blush', keywords: ['do mat', 'ngai', 'thien cam'] },
      { emoji: '😇', name: 'Halo', keywords: ['thien than', 'ngoan', 'angel'] },
      { emoji: '🥰', name: 'Love hearts', keywords: ['yeu', 'love', 'tim', 'tinh cam'] },
      { emoji: '😍', name: 'Heart eyes', keywords: ['me', 'yeu thich', 'say dam'] },
      { emoji: '🤩', name: 'Star struck', keywords: ['ngoi sao', 'dinh', 'than tuong'] },
      { emoji: '😘', name: 'Kiss', keywords: ['hon', 'kiss', 'yeu'] },
      { emoji: '😗', name: 'Kissing', keywords: ['chu moi', 'hon nhe'] },
      { emoji: '😚', name: 'Kiss closed eyes', keywords: ['hon nham mat'] },
      { emoji: '😙', name: 'Kiss smiling', keywords: ['hon cuoi'] },
      { emoji: '😋', name: 'Yummy', keywords: ['ngon', 'them an', 'le luoi'] },
      { emoji: '😛', name: 'Tongue', keywords: ['le luoi', 'troll'] },
      { emoji: '😜', name: 'Wink tongue', keywords: ['nhay mat le luoi', 'troll'] },
      { emoji: '🤪', name: 'Zany', keywords: ['dien loan', 'quay'] },
      { emoji: '😝', name: 'Squint tongue', keywords: ['le luoi tit mat'] },
      { emoji: '🤑', name: 'Money mouth', keywords: ['tien', 'money', 'giau'] },
      { emoji: '🤗', name: 'Hugging', keywords: ['om', 'hug', 'than thien'] },
      { emoji: '🤭', name: 'Hand over mouth', keywords: ['che mieng cuoi', 'ngai'] },
      { emoji: '🤫', name: 'Shushing', keywords: ['suyt', 'im lang', 'bi mat'] },
      { emoji: '🤔', name: 'Thinking', keywords: ['suy nghi', 'think', 'suy tu'] },
      { emoji: '🤐', name: 'Zipper mouth', keywords: ['khoa mieng', 'im lang'] },
      { emoji: '🤨', name: 'Raised eyebrow', keywords: ['nhuong may', 'nghi ngo'] },
      { emoji: '😐', name: 'Neutral', keywords: ['mat do', 'neutral'] },
      { emoji: '😑', name: 'Expressionless', keywords: ['can loi', 'bat luc'] },
      { emoji: '😶', name: 'No mouth', keywords: ['khong mieng', 'im lang'] },
      { emoji: '😏', name: 'Smirk', keywords: ['cuoi nhech mep', 'gian xao'] },
      { emoji: '😒', name: 'Unamused', keywords: ['kho chiu', 'chan'] },
      { emoji: '🙄', name: 'Roll eyes', keywords: ['dao mat', 'chan nan'] },
      { emoji: '😬', name: 'Grimace', keywords: ['nguong ngung', 'e che'] },
      { emoji: '🤥', name: 'Lying', keywords: ['noi doi', 'mui dai'] },
      { emoji: '😌', name: 'Relieved', keywords: ['nhe nhom', 'yen binh'] },
      { emoji: '😔', name: 'Pensive', keywords: ['buon', 'suy sup'] },
      { emoji: '😪', name: 'Sleepy', keywords: ['buon ngu', 'met'] },
      { emoji: '🤤', name: 'Drooling', keywords: ['chay nuoc mieng', 'them'] },
      { emoji: '😴', name: 'Sleeping', keywords: ['ngu', 'sleep'] },
      { emoji: '😷', name: 'Mask', keywords: ['khau trang', 'benh'] },
      { emoji: '🤒', name: 'Thermometer', keywords: ['sot', 'om'] },
      { emoji: '🤕', name: 'Bandage', keywords: ['bang bo', 'thuong'] },
      { emoji: '🤢', name: 'Nauseated', keywords: ['buon non'] },
      { emoji: '🤮', name: 'Vomiting', keywords: ['non mua'] },
      { emoji: '🤧', name: 'Sneezing', keywords: ['hat xi'] },
      { emoji: '🥵', name: 'Hot face', keywords: ['nong', 'hot'] },
      { emoji: '🥶', name: 'Cold face', keywords: ['lanh', 'cold'] },
      { emoji: '🥴', name: 'Woozy', keywords: ['say', 'chong mat'] },
      { emoji: '😵', name: 'Dizzy', keywords: ['choang', 'hoa mat'] },
      { emoji: '🤯', name: 'Exploding head', keywords: ['no tung nao', 'mindblown'] },
      { emoji: '🤠', name: 'Cowboy', keywords: ['cao boi'] },
      { emoji: '🥳', name: 'Partying', keywords: ['an mung', 'tiec', 'party'] },
      { emoji: '😎', name: 'Sunglasses', keywords: ['ngau', 'cool', 'kinh ram'] },
      { emoji: '🤓', name: 'Nerd', keywords: ['mot sach', 'kinh can'] },
      { emoji: '🧐', name: 'Monocle', keywords: ['kinh lup', 'soi'] },
      { emoji: '😕', name: 'Confused', keywords: ['boi roi'] },
      { emoji: '😟', name: 'Worried', keywords: ['lo lang'] },
      { emoji: '😮', name: 'Open mouth', keywords: ['ha hoc mieng'] },
      { emoji: '😲', name: 'Astonished', keywords: ['kinh ngac'] },
      { emoji: '😳', name: 'Flushed', keywords: ['ngac nhien do mat'] },
      { emoji: '🥺', name: 'Pleading', keywords: ['cau xin', 'nan ni'] },
      { emoji: '😦', name: 'Frowning', keywords: ['cau may'] },
      { emoji: '😨', name: 'Fearful', keywords: ['so hai'] },
      { emoji: '😰', name: 'Anxious', keywords: ['lo au'] },
      { emoji: '😥', name: 'Sad relief', keywords: ['buon nhe nhom'] },
      { emoji: '😢', name: 'Crying', keywords: ['khoc', 'sad'] },
      { emoji: '😭', name: 'Loudly crying', keywords: ['khoc to', 'sobbing'] },
      { emoji: '😱', name: 'Screaming', keywords: ['het len', 'kinh hoang'] },
      { emoji: '😖', name: 'Confounded', keywords: ['kho chiu'] },
      { emoji: '😣', name: 'Persevering', keywords: ['chiu dung'] },
      { emoji: '😞', name: 'Disappointed', keywords: ['that vong'] },
      { emoji: '😓', name: 'Downcast sweat', keywords: ['mo hoi hoi han'] },
      { emoji: '😩', name: 'Weary', keywords: ['met moi'] },
      { emoji: '😫', name: 'Tired', keywords: ['kiet suc'] },
      { emoji: '🥱', name: 'Yawning', keywords: ['ngap'] },
      { emoji: '😤', name: 'Triumph steam', keywords: ['tho phao', 'gian'] },
      { emoji: '😡', name: 'Pouting rage', keywords: ['tuc gian', 'angry'] },
      { emoji: '😠', name: 'Angry', keywords: ['tuc', 'gian'] },
      { emoji: '🤬', name: 'Cursing', keywords: ['chui the', 'tuc dien'] },
      { emoji: '😈', name: 'Devil smile', keywords: ['quy cuoi', 'ac quy'] },
      { emoji: '👿', name: 'Devil angry', keywords: ['quy gian'] },
      { emoji: '💀', name: 'Skull', keywords: ['dau lau', 'chet'] },
      { emoji: '💩', name: 'Poop', keywords: ['phan', 'hai huoc'] },
      { emoji: '🤡', name: 'Clown', keywords: ['he', 'troll'] },
      { emoji: '👻', name: 'Ghost', keywords: ['ma', 'ghost'] },
      { emoji: '👽', name: 'Alien', keywords: ['nguoi ngoai hanh tinh'] },
      { emoji: '🤖', name: 'Robot', keywords: ['nguoi may', 'ai', 'bot'] },
    ],
  },
  {
    id: 'people',
    name: 'Bàn tay & Cử chỉ',
    icon: Users,
    emojis: [
      { emoji: '👋', name: 'Waving hand', keywords: ['vay tay', 'chao', 'hello'] },
      { emoji: '🤚', name: 'Raised back', keywords: ['gio tay'] },
      { emoji: '🖐️', name: 'Five fingers', keywords: ['nam ngon'] },
      { emoji: '✋', name: 'Raised hand', keywords: ['dung lai', 'gio tay'] },
      { emoji: '🖖', name: 'Vulcan', keywords: ['vulcan', 'chao'] },
      { emoji: '👌', name: 'OK hand', keywords: ['ok', 'dong y', 'chuan'] },
      { emoji: '🤌', name: 'Pinched fingers', keywords: ['y gi day', 'bep'] },
      { emoji: '🤏', name: 'Pinching hand', keywords: ['mot chut', 'ti teo'] },
      { emoji: '✌️', name: 'Victory', keywords: ['hai ngon', 'chien thang', 'peace'] },
      { emoji: '🤞', name: 'Crossed fingers', keywords: ['may man', 'chuc may man'] },
      { emoji: '🤟', name: 'Love you gesture', keywords: ['yeu thuong'] },
      { emoji: '🤘', name: 'Rock on', keywords: ['rock', 'chat'] },
      { emoji: '🤙', name: 'Call me', keywords: ['goi nhe'] },
      { emoji: '👈', name: 'Point left', keywords: ['chi trai'] },
      { emoji: '👉', name: 'Point right', keywords: ['chi phai'] },
      { emoji: '👆', name: 'Point up', keywords: ['chi len'] },
      { emoji: '👇', name: 'Point down', keywords: ['chi xuong'] },
      { emoji: '☝️', name: 'Index up', keywords: ['so 1', 'chi len'] },
      { emoji: '👍', name: 'Thumbs up', keywords: ['like', 'thich', 'dong y', 'chuan'] },
      { emoji: '👎', name: 'Thumbs down', keywords: ['dislike', 'khong thich'] },
      { emoji: '✊', name: 'Fist', keywords: ['nam tay', 'quyet tam'] },
      { emoji: '👊', name: 'Punch', keywords: ['dam', 'punch'] },
      { emoji: '🤛', name: 'Left fist', keywords: ['dam trai'] },
      { emoji: '🤜', name: 'Right fist', keywords: ['dam phai'] },
      { emoji: '👏', name: 'Clapping hands', keywords: ['vo tay', 'clap', 'khen'] },
      { emoji: '🙌', name: 'Raising hands', keywords: ['gio 2 tay', 'hoan ho'] },
      { emoji: '👐', name: 'Open hands', keywords: ['mo 2 tay'] },
      { emoji: '🤲', name: 'Palms together', keywords: ['cau nguyen'] },
      { emoji: '🤝', name: 'Handshake', keywords: ['bat tay', 'hop tac', 'dong y'] },
      { emoji: '🙏', name: 'Folded hands', keywords: ['cam on', 'xin', 'pray', 'thanks'] },
      { emoji: '✍️', name: 'Writing', keywords: ['viet', 'ghi chep', 'hoc'] },
      { emoji: '💅', name: 'Nail polish', keywords: ['son mong tay'] },
      { emoji: '🤳', name: 'Selfie', keywords: ['tu suong'] },
      { emoji: '💪', name: 'Flexed biceps', keywords: ['khoe', 'co bap', 'quyet tam', 'co len'] },
      { emoji: '👀', name: 'Eyes', keywords: ['mat', 'nhin', 'xem', 'can than'] },
      { emoji: '👁️', name: 'Eye', keywords: ['mot mat'] },
      { emoji: '🧠', name: 'Brain', keywords: ['nao', 'thong minh', 'iq'] },
    ],
  },
  {
    id: 'nature',
    name: 'Động vật & Thiên nhiên',
    icon: Leaf,
    emojis: [
      { emoji: '🐶', name: 'Dog', keywords: ['cho', 'dog'] },
      { emoji: '🐱', name: 'Cat', keywords: ['meo', 'cat'] },
      { emoji: '🐭', name: 'Mouse', keywords: ['chuot'] },
      { emoji: '🐹', name: 'Hamster', keywords: ['chuot hamster'] },
      { emoji: '🐰', name: 'Rabbit', keywords: ['tho'] },
      { emoji: '🦊', name: 'Fox', keywords: ['cao'] },
      { emoji: '🐻', name: 'Bear', keywords: ['gau'] },
      { emoji: '🐼', name: 'Panda', keywords: ['gau truc'] },
      { emoji: '🐨', name: 'Koala', keywords: ['koala'] },
      { emoji: '🐯', name: 'Tiger', keywords: ['ho'] },
      { emoji: '🦁', name: 'Lion', keywords: ['su tu'] },
      { emoji: '🐮', name: 'Cow', keywords: ['bo'] },
      { emoji: '🐷', name: 'Pig', keywords: ['heo', 'lon'] },
      { emoji: '🐸', name: 'Frog', keywords: ['ech'] },
      { emoji: '🐵', name: 'Monkey', keywords: ['khi'] },
      { emoji: '🐔', name: 'Chicken', keywords: ['ga'] },
      { emoji: '🐧', name: 'Penguin', keywords: ['chim canh cut'] },
      { emoji: '🐦', name: 'Bird', keywords: ['chim'] },
      { emoji: '🦅', name: 'Eagle', keywords: ['dai bang'] },
      { emoji: '🦉', name: 'Owl', keywords: ['cu meo'] },
      { emoji: '🐝', name: 'Bee', keywords: ['ong'] },
      { emoji: '🐛', name: 'Bug', keywords: ['sau'] },
      { emoji: '🦋', name: 'Butterfly', keywords: ['buom'] },
      { emoji: '🌸', name: 'Cherry blossom', keywords: ['hoa anh dao'] },
      { emoji: '🌹', name: 'Rose', keywords: ['hoa hong'] },
      { emoji: '🌺', name: 'Hibiscus', keywords: ['hoa dam but'] },
      { emoji: '🌻', name: 'Sunflower', keywords: ['hoa huong duong'] },
      { emoji: '🌼', name: 'Blossom', keywords: ['hoa vang'] },
      { emoji: '🌷', name: 'Tulip', keywords: ['hoa tulip'] },
      { emoji: '🌱', name: 'Seedling', keywords: ['cay non', 'mam'] },
      { emoji: '🌲', name: 'Evergreen tree', keywords: ['cay thong'] },
      { emoji: '🌳', name: 'Deciduous tree', keywords: ['cay xanh'] },
      { emoji: '🌴', name: 'Palm tree', keywords: ['cay dua'] },
      { emoji: '🍀', name: 'Four leaf clover', keywords: ['co 4 la', 'may man'] },
      { emoji: '🍁', name: 'Maple leaf', keywords: ['la phong'] },
      { emoji: '🍂', name: 'Fallen leaf', keywords: ['la rung'] },
      { emoji: '🍃', name: 'Leaf flutter', keywords: ['la xanh'] },
      { emoji: '⭐', name: 'Star', keywords: ['ngoi sao'] },
      { emoji: '🌟', name: 'Glowing star', keywords: ['sao sang'] },
      { emoji: '✨', name: 'Sparkles', keywords: ['lap lanh', 'ai', 'magic', 'sang'] },
      { emoji: '⚡', name: 'Lightning', keywords: ['sam set', 'nhanh'] },
      { emoji: '🔥', name: 'Fire', keywords: ['lua', 'chay', 'hot', 'dinh'] },
      { emoji: '🌈', name: 'Rainbow', keywords: ['cau vong'] },
      { emoji: '☀️', name: 'Sun', keywords: ['mat troi'] },
      { emoji: '🌙', name: 'Moon', keywords: ['mat trang'] },
    ],
  },
  {
    id: 'food',
    name: 'Đồ ăn & Thức uống',
    icon: Utensils,
    emojis: [
      { emoji: '🍏', name: 'Green apple', keywords: ['tao xanh'] },
      { emoji: '🍎', name: 'Red apple', keywords: ['tao do'] },
      { emoji: '🍐', name: 'Pear', keywords: ['le'] },
      { emoji: '🍊', name: 'Tangerine', keywords: ['cam'] },
      { emoji: '🍋', name: 'Lemon', keywords: ['chanh'] },
      { emoji: '🍌', name: 'Banana', keywords: ['chuoi'] },
      { emoji: '🍉', name: 'Watermelon', keywords: ['dua hau'] },
      { emoji: '🍇', name: 'Grapes', keywords: ['nho'] },
      { emoji: '🍓', name: 'Strawberry', keywords: ['dau tay'] },
      { emoji: '🍒', name: 'Cherries', keywords: ['cherry'] },
      { emoji: '🍑', name: 'Peach', keywords: ['dao'] },
      { emoji: '🥭', name: 'Mango', keywords: ['xoai'] },
      { emoji: '🍍', name: 'Pineapple', keywords: ['dua', 'thom'] },
      { emoji: '🥑', name: 'Avocado', keywords: ['bo'] },
      { emoji: '🍔', name: 'Hamburger', keywords: ['burger', 'banh mi'] },
      { emoji: '🍟', name: 'French fries', keywords: ['khoai tay chien'] },
      { emoji: '🍕', name: 'Pizza', keywords: ['pizza'] },
      { emoji: '🥪', name: 'Sandwich', keywords: ['sandwich'] },
      { emoji: '🌮', name: 'Taco', keywords: ['taco'] },
      { emoji: '🍜', name: 'Noodles', keywords: ['mi', 'pho'] },
      { emoji: '🍲', name: 'Pot of food', keywords: ['noi sup', 'lau'] },
      { emoji: '🍣', name: 'Sushi', keywords: ['sushi'] },
      { emoji: '🍱', name: 'Bento', keywords: ['com hop'] },
      { emoji: '🥟', name: 'Dumpling', keywords: ['sui cao'] },
      { emoji: '🍰', name: 'Shortcake', keywords: ['banh kem'] },
      { emoji: '🎂', name: 'Birthday cake', keywords: ['banh sinh nhat'] },
      { emoji: '🍦', name: 'Ice cream', keywords: ['kem'] },
      { emoji: '🍩', name: 'Donut', keywords: ['donut'] },
      { emoji: '🍪', name: 'Cookie', keywords: ['banh quy'] },
      { emoji: '🍫', name: 'Chocolate', keywords: ['socola'] },
      { emoji: '🍿', name: 'Popcorn', keywords: ['bap rang bo'] },
      { emoji: '☕', name: 'Coffee', keywords: ['ca phe', 'coffee', 'sang'] },
      { emoji: '🧋', name: 'Boba', keywords: ['tra sua'] },
      { emoji: '🍵', name: 'Teacup', keywords: ['tra'] },
      { emoji: '🍺', name: 'Beer', keywords: ['bia', 'nhau'] },
      { emoji: '🍻', name: 'Clinking beers', keywords: ['cung ly bia', 'cheers'] },
      { emoji: '🥂', name: 'Clinking glasses', keywords: ['nang ly', 'chuc mung'] },
      { emoji: '🍷', name: 'Wine', keywords: ['ruou vang'] },
      { emoji: '🧃', name: 'Beverage box', keywords: ['nuoc ep'] },
    ],
  },
  {
    id: 'activities',
    name: 'Hoạt động & Thể thao',
    icon: Trophy,
    emojis: [
      { emoji: '⚽', name: 'Soccer ball', keywords: ['bong da', 'football'] },
      { emoji: '🏀', name: 'Basketball', keywords: ['bong ro'] },
      { emoji: '🏈', name: 'American football', keywords: ['bong bau duc'] },
      { emoji: '⚾', name: 'Baseball', keywords: ['bong chay'] },
      { emoji: '🎾', name: 'Tennis', keywords: ['tennis', 'quan vot'] },
      { emoji: '🏐', name: 'Volleyball', keywords: ['bong chuyen'] },
      { emoji: '🏓', name: 'Ping pong', keywords: ['bong ban'] },
      { emoji: '🏸', name: 'Badminton', keywords: ['cau long'] },
      { emoji: '🥊', name: 'Boxing glove', keywords: ['boxing', 'dam boc'] },
      { emoji: '🥋', name: 'Martial arts', keywords: ['vo thuat'] },
      { emoji: '🏊', name: 'Swimmer', keywords: ['boi loi'] },
      { emoji: '🚴', name: 'Bicyclist', keywords: ['dap xe'] },
      { emoji: '🏆', name: 'Trophy', keywords: ['cup', 'vo dich', 'nhat'] },
      { emoji: '🥇', name: '1st place', keywords: ['huan chuong vang', 'nhat'] },
      { emoji: '🥈', name: '2nd place', keywords: ['huan chuong bac', 'nhi'] },
      { emoji: '🥉', name: '3rd place', keywords: ['huan chuong dong', 'ba'] },
      { emoji: '🎖️', name: 'Military medal', keywords: ['huy chuong'] },
      { emoji: '🎗️', name: 'Reminder ribbon', keywords: ['ruy bang'] },
      { emoji: '🎫', name: 'Ticket', keywords: ['ve'] },
      { emoji: '🎟️', name: 'Admission tickets', keywords: ['ve vao cua'] },
      { emoji: '🎨', name: 'Artist palette', keywords: ['ve tranh', 'nghe thuat'] },
      { emoji: '🎬', name: 'Clapper board', keywords: ['dien anh', 'phim'] },
      { emoji: '🎤', name: 'Microphone', keywords: ['hat', 'mic', 'karaoke'] },
      { emoji: '🎧', name: 'Headphones', keywords: ['tai nghe', 'nghe nhac'] },
      { emoji: '🎼', name: 'Musical score', keywords: ['khuon nhac'] },
      { emoji: '🎹', name: 'Musical keyboard', keywords: ['piano'] },
      { emoji: '🥁', name: 'Drum', keywords: ['trong'] },
      { emoji: '🎷', name: 'Saxophone', keywords: ['ken saxo'] },
      { emoji: '🎸', name: 'Guitar', keywords: ['dan guitar'] },
      { emoji: '🎮', name: 'Video game', keywords: ['game', 'choi game'] },
      { emoji: '🎯', name: 'Direct hit', keywords: ['phi tieu', 'chinh xac'] },
      { emoji: '🎳', name: 'Bowling', keywords: ['bowling'] },
      { emoji: '🎲', name: 'Game die', keywords: ['xuc xac'] },
    ],
  },
  {
    id: 'objects',
    name: 'Đồ vật & Công nghệ',
    icon: Lightbulb,
    emojis: [
      { emoji: '💻', name: 'Laptop', keywords: ['may tinh', 'laptop', 'code'] },
      { emoji: '🖥️', name: 'Desktop computer', keywords: ['may tinh de ban'] },
      { emoji: '🖨️', name: 'Printer', keywords: ['may in'] },
      { emoji: '⌨️', name: 'Keyboard', keywords: ['ban phim'] },
      { emoji: '🖱️', name: 'Mouse', keywords: ['chuot may tinh'] },
      { emoji: '📱', name: 'Mobile phone', keywords: ['dien thoai'] },
      { emoji: '💡', name: 'Light bulb', keywords: ['y tuong', 'idea', 'sang tao'] },
      { emoji: '📚', name: 'Books', keywords: ['sach', 'giao trinh', 'hoc tap'] },
      { emoji: '📖', name: 'Open book', keywords: ['mo sach', 'doc'] },
      { emoji: '🎓', name: 'Graduation cap', keywords: ['tot nghiep', 'dai hoc', 'uth'] },
      { emoji: '📝', name: 'Memo', keywords: ['ghi chu', 'bai viet', 'de thi'] },
      { emoji: '📋', name: 'Clipboard', keywords: ['bang ghi chep'] },
      { emoji: '📌', name: 'Pushpin', keywords: ['ghim', 'pin'] },
      { emoji: '📎', name: 'Paperclip', keywords: ['dinh kem', 'tep tin'] },
      { emoji: '📂', name: 'File folder', keywords: ['thu muc'] },
      { emoji: '📁', name: 'Closed folder', keywords: ['tep tin'] },
      { emoji: '📄', name: 'Page facing up', keywords: ['van ban', 'doc', 'word'] },
      { emoji: '📊', name: 'Bar chart', keywords: ['bieu do', 'thong ke'] },
      { emoji: '📈', name: 'Chart increasing', keywords: ['tang truong', 'phat trien'] },
      { emoji: '📉', name: 'Chart decreasing', keywords: ['giam sut'] },
      { emoji: '📅', name: 'Calendar', keywords: ['lich', 'ngay thang'] },
      { emoji: '📆', name: 'Tear off calendar', keywords: ['to lich'] },
      { emoji: '⏰', name: 'Alarm clock', keywords: ['dong ho bao thuc', 'gio'] },
      { emoji: '⏱️', name: 'Stopwatch', keywords: ['dong ho bam gio'] },
      { emoji: '⏳', name: 'Hourglass', keywords: ['dong ho cat', 'cho doi'] },
      { emoji: '🔒', name: 'Locked', keywords: ['khoa', 'bao mat'] },
      { emoji: '🔓', name: 'Unlocked', keywords: ['mo khoa'] },
      { emoji: '🔑', name: 'Key', keywords: ['chia khoa'] },
      { emoji: '🔔', name: 'Bell', keywords: ['chuong', 'thong bao'] },
      { emoji: '📢', name: 'Loudspeaker', keywords: ['loa', 'thong bao', 'everyone'] },
      { emoji: '📣', name: 'Megaphone', keywords: ['loa cam tay'] },
      { emoji: '🎉', name: 'Party popper', keywords: ['phao hoa', 'chuc mung', 'party'] },
      { emoji: '🎊', name: 'Confetti ball', keywords: ['phao giay'] },
      { emoji: '🎁', name: 'Wrapped gift', keywords: ['qua tang'] },
    ],
  },
  {
    id: 'symbols',
    name: 'Biểu tượng & Trái tim',
    icon: Heart,
    emojis: [
      { emoji: '❤️', name: 'Red heart', keywords: ['tim do', 'yeu', 'love'] },
      { emoji: '🧡', name: 'Orange heart', keywords: ['tim cam'] },
      { emoji: '💛', name: 'Yellow heart', keywords: ['tim vang'] },
      { emoji: '💚', name: 'Green heart', keywords: ['tim xanh la'] },
      { emoji: '💙', name: 'Blue heart', keywords: ['tim xanh duong'] },
      { emoji: '💜', name: 'Purple heart', keywords: ['tim tim'] },
      { emoji: '🖤', name: 'Black heart', keywords: ['tim den'] },
      { emoji: '🤍', name: 'White heart', keywords: ['tim trang'] },
      { emoji: '💔', name: 'Broken heart', keywords: ['tan vo', 'that tinh'] },
      { emoji: '❣️', name: 'Heart exclamation', keywords: ['dau cham tim'] },
      { emoji: '💕', name: 'Two hearts', keywords: ['hai trai tim'] },
      { emoji: '💞', name: 'Revolving hearts', keywords: ['trai tim xoay'] },
      { emoji: '💓', name: 'Beating heart', keywords: ['tim dap'] },
      { emoji: '💗', name: 'Growing heart', keywords: ['tim lon dan'] },
      { emoji: '💖', name: 'Sparkling heart', keywords: ['tim lap lanh'] },
      { emoji: '💯', name: 'Hundred points', keywords: ['100 diem', 'chuan', 'tuyet doi'] },
      { emoji: '✅', name: 'Check mark', keywords: ['dung', 'xong', 'check', 'ok'] },
      { emoji: '✔️', name: 'Heavy check', keywords: ['tich'] },
      { emoji: '❌', name: 'Cross mark', keywords: ['sai', 'huy', 'bo'] },
      { emoji: '❎', name: 'Cross box', keywords: ['o gach'] },
      { emoji: '⚠️', name: 'Warning', keywords: ['canh bao', 'chu y'] },
      { emoji: '⛔', name: 'No entry', keywords: ['cam vao'] },
      { emoji: '🚫', name: 'Prohibited', keywords: ['cam'] },
      { emoji: '❓', name: 'Question', keywords: ['hoi cham', 'thac mac'] },
      { emoji: '❗', name: 'Exclamation', keywords: ['than phien', 'cham than'] },
      { emoji: '💤', name: 'Zzz', keywords: ['ngu say'] },
      { emoji: '🆗', name: 'OK button', keywords: ['ok'] },
      { emoji: '🆙', name: 'UP button', keywords: ['len'] },
      { emoji: '🆒', name: 'COOL button', keywords: ['ngau'] },
      { emoji: '🆕', name: 'NEW button', keywords: ['moi'] },
      { emoji: '🆓', name: 'FREE button', keywords: ['mien phi'] },
    ],
  },
  {
    id: 'flags',
    name: 'Cờ quốc gia',
    icon: Flag,
    emojis: [
      { emoji: '🇻🇳', name: 'Vietnam', keywords: ['viet nam', 'vn'] },
      { emoji: '🇺🇸', name: 'United States', keywords: ['my', 'usa'] },
      { emoji: '🇬🇧', name: 'United Kingdom', keywords: ['anh', 'uk'] },
      { emoji: '🇯🇵', name: 'Japan', keywords: ['nhat ban'] },
      { emoji: '🇰🇷', name: 'South Korea', keywords: ['han quoc'] },
      { emoji: '🇨🇳', name: 'China', keywords: ['trung quoc'] },
      { emoji: '🇫🇷', name: 'France', keywords: ['phap'] },
      { emoji: '🇩🇪', name: 'Germany', keywords: ['duc'] },
      { emoji: '🇷🇺', name: 'Russia', keywords: ['nga'] },
      { emoji: '🇨🇦', name: 'Canada', keywords: ['canada'] },
      { emoji: '🇦🇺', name: 'Australia', keywords: ['uc'] },
      { emoji: '🇸🇬', name: 'Singapore', keywords: ['singapore'] },
      { emoji: '🇹🇭', name: 'Thailand', keywords: ['thai lan'] },
      { emoji: '🚩', name: 'Triangular flag', keywords: ['co do'] },
      { emoji: '🏁', name: 'Chequered flag', keywords: ['co dich'] },
    ],
  },
];

const DEFAULT_FREQUENT: string[] = ['👍', '❤️', '👏', '💡', '🔥', '📚', '🎓', '✍️', '🎉', '✅', '😂', '👀', '💯', '🙏', '✨', '☕'];

export const SlackEmojiPicker: React.FC<SlackEmojiPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('frequently');
  const [hoveredEmoji, setHoveredEmoji] = useState<{ emoji: string; name: string } | null>(null);
  const [frequentEmojis, setFrequentEmojis] = useState<string[]>(DEFAULT_FREQUENT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('qgroup_recent_emojis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFrequentEmojis(parsed);
        }
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  const handlePick = (emoji: string) => {
    onSelect(emoji);
    // Update frequently used
    setFrequentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 24);
      try {
        localStorage.setItem('qgroup_recent_emojis', JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  // Search filter across all emojis
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.trim().toLowerCase();
    const results: { emoji: string; name: string }[] = [];
    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (
          item.name.toLowerCase().includes(q) ||
          item.emoji.includes(q) ||
          item.keywords.some((k) => k.toLowerCase().includes(q))
        ) {
          results.push({ emoji: item.emoji, name: item.name });
        }
      }
    }
    return results;
  }, [search]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute left-0 bottom-12 z-50 w-80 sm:w-96 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[400px] animate-scale-up select-none"
    >
      {/* ── Search Bar ── */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/80">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm biểu tượng cảm xúc..."
            autoFocus
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200 transition-all placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Category Bar (Slack Style) ── */}
      {!searchResults && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 bg-white overflow-x-auto no-scrollbar gap-1">
          <button
            type="button"
            onClick={() => setActiveCategory('frequently')}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeCategory === 'frequently'
                ? 'bg-teal-50 text-teal-700 font-bold'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title="Thường dùng"
          >
            <Clock className="w-4 h-4" />
          </button>
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-bold'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={cat.name}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Emoji Grid ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {searchResults ? (
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Kết quả tìm kiếm ({searchResults.length})
            </div>
            {searchResults.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                Không tìm thấy biểu tượng phù hợp
              </div>
            ) : (
              <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                {searchResults.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePick(item.emoji)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-125 cursor-pointer active:scale-95"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeCategory === 'frequently' ? (
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>Thường dùng</span>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
              {frequentEmojis.map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePick(emoji)}
                  onMouseEnter={() => setHoveredEmoji({ emoji, name: 'Thường dùng' })}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-125 cursor-pointer active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Quick list of top categories */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mặt cười & Cảm xúc
              </div>
              <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                {EMOJI_CATEGORIES[0].emojis.slice(0, 36).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePick(item.emoji)}
                    onMouseEnter={() => setHoveredEmoji(item)}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-125 cursor-pointer active:scale-95"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const cat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory);
            if (!cat) return null;
            return (
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {cat.name}
                </div>
                <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                  {cat.emojis.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePick(item.emoji)}
                      onMouseEnter={() => setHoveredEmoji(item)}
                      className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-xl transition-all hover:scale-125 cursor-pointer active:scale-95"
                    >
                      {item.emoji}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* ── Slack Footer Preview ── */}
      <div className="px-3 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2.5 text-xs text-slate-600">
        {hoveredEmoji ? (
          <>
            <span className="text-2xl leading-none">{hoveredEmoji.emoji}</span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 text-xs truncate">:{hoveredEmoji.name}:</p>
              <p className="text-[10px] text-slate-400">Bấm để chèn vào tin nhắn</p>
            </div>
          </>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Di chuột để xem biểu tượng</span>
        )}
      </div>
    </div>
  );
};
