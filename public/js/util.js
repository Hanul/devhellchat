global.UTIL = {
	
	champiFilter : (str) => {
		[
			'(데|대) *(뎃|댓)',
			'ㄷ *(ㅔ|ㅐ) *(뎃|댓)',
			'(뎃|댓) *데',
			'(뎃|댓) *ㄷ *(ㅔ|ㅐ)', 
			'(닌|닝) *겐 *상',
			'프 *니 *프 *니',
			'프 *(ㄴ|L|└) *(1|l|i|I|ㅣ|\|)',
			'픈 *이',
			'쿠 *(이|잉)',
			'쿠 *(O|o|0) *(1|l|i|I|ㅣ|\|)',
			'(뭇|믓|테|쿠) *치',
			'(테|텟|태|탯) *챠',
			'(데|뎃|대|댓) *스 *($|우|웅)?',
			'(레|래) *(후|휴|휘)',
			'(ㄹ|근) *(ㅔ|ㅐ) *(후|휴|휘)',
			'붕 *쯔',
			'(데|뎃) *샤',
			'(텟|테) *(츄|츙|치)',
			'r *e *h *u',
			'쿠 *E',
			'세 *레 *브',
			'ㅅ *ㅔ *레 *브',
			'ㅅ *ㅔ ㄹ *ㅔ *브',
			'세 *ㄹ *ㅔ *브',
			'(데|테|대|태) *엥',
			'(ㄷ|ㅌ) *(ㅔ|ㅐ) *엥',
			'인 *간 *씨',
			'와 *타 *시',
			'(레|래|렛|랫) *삐',
		].forEach((v) => {
			str = str.replace((new RegExp(v, 'g')), '.');
		});
		return str;
	}
};