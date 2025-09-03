using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.security;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000023 RID: 35
	public class DigestUtils : Object
	{
		// Token: 0x06000149 RID: 329 RVA: 0x000064B4 File Offset: 0x000046B4
		[LineNumberTable(new byte[] { 36, 124, 97 })]
		[MethodImpl(8)]
		public static MessageDigest getDigest(string algorithm)
		{
			MessageDigest instance;
			NoSuchAlgorithmException ex2;
			try
			{
				instance = MessageDigest.getInstance(algorithm);
			}
			catch (NoSuchAlgorithmException ex)
			{
				ex2 = ByteCodeHelper.MapException<NoSuchAlgorithmException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_0018;
			}
			return instance;
			IL_0018:
			NoSuchAlgorithmException ex3 = ex2;
			Exception ex4 = ex3;
			Throwable.__<suppressFillInStackTrace>();
			throw new IllegalArgumentException(ex4);
		}

		// Token: 0x0600014A RID: 330 RVA: 0x000064FC File Offset: 0x000046FC
		[LineNumberTable(130)]
		[MethodImpl(8)]
		public static MessageDigest getSha1Digest()
		{
			return DigestUtils.getDigest("SHA-1");
		}

		// Token: 0x0600014B RID: 331 RVA: 0x0000650A File Offset: 0x0000470A
		[LineNumberTable(103)]
		[MethodImpl(8)]
		public static MessageDigest getMd2Digest()
		{
			return DigestUtils.getDigest("MD2");
		}

		// Token: 0x0600014C RID: 332 RVA: 0x00006518 File Offset: 0x00004718
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(new byte[] { 159, 191, 107, 142, 100, 105, 176 })]
		[MethodImpl(8)]
		private static byte[] digest(MessageDigest A_0, InputStream A_1)
		{
			byte[] array = new byte[1024];
			for (int i = A_1.read(array, 0, 1024); i > -1; i = A_1.read(array, 0, 1024))
			{
				A_0.update(array, 0, i);
			}
			return A_0.digest();
		}

		// Token: 0x0600014D RID: 333 RVA: 0x00006563 File Offset: 0x00004763
		[LineNumberTable(68)]
		[MethodImpl(8)]
		private static byte[] getBytesUtf8(string A_0)
		{
			return StringUtils.getBytesUtf8(A_0);
		}

		// Token: 0x0600014E RID: 334 RVA: 0x0000656D File Offset: 0x0000476D
		[LineNumberTable(203)]
		[MethodImpl(8)]
		public static byte[] md2(byte[] data)
		{
			return DigestUtils.getMd2Digest().digest(data);
		}

		// Token: 0x0600014F RID: 335 RVA: 0x0000657C File Offset: 0x0000477C
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(217)]
		[MethodImpl(8)]
		public static byte[] md2(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getMd2Digest(), data);
		}

		// Token: 0x06000150 RID: 336 RVA: 0x0000658B File Offset: 0x0000478B
		[LineNumberTable(229)]
		[MethodImpl(8)]
		public static byte[] md2(string data)
		{
			return DigestUtils.md2(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x06000151 RID: 337 RVA: 0x0000659A File Offset: 0x0000479A
		[LineNumberTable(116)]
		[MethodImpl(8)]
		public static MessageDigest getMd5Digest()
		{
			return DigestUtils.getDigest("MD5");
		}

		// Token: 0x06000152 RID: 338 RVA: 0x000065A8 File Offset: 0x000047A8
		[LineNumberTable(278)]
		[MethodImpl(8)]
		public static byte[] md5(byte[] data)
		{
			return DigestUtils.getMd5Digest().digest(data);
		}

		// Token: 0x06000153 RID: 339 RVA: 0x000065B7 File Offset: 0x000047B7
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(292)]
		[MethodImpl(8)]
		public static byte[] md5(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getMd5Digest(), data);
		}

		// Token: 0x06000154 RID: 340 RVA: 0x000065C6 File Offset: 0x000047C6
		[LineNumberTable(303)]
		[MethodImpl(8)]
		public static byte[] md5(string data)
		{
			return DigestUtils.md5(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x06000155 RID: 341 RVA: 0x000065D5 File Offset: 0x000047D5
		[LineNumberTable(393)]
		[MethodImpl(8)]
		public static byte[] sha1(byte[] data)
		{
			return DigestUtils.getSha1Digest().digest(data);
		}

		// Token: 0x06000156 RID: 342 RVA: 0x000065E4 File Offset: 0x000047E4
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(407)]
		[MethodImpl(8)]
		public static byte[] sha1(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getSha1Digest(), data);
		}

		// Token: 0x06000157 RID: 343 RVA: 0x000065F3 File Offset: 0x000047F3
		[LineNumberTable(418)]
		[MethodImpl(8)]
		public static byte[] sha1(string data)
		{
			return DigestUtils.sha1(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x06000158 RID: 344 RVA: 0x00006602 File Offset: 0x00004802
		[LineNumberTable(146)]
		[MethodImpl(8)]
		public static MessageDigest getSha256Digest()
		{
			return DigestUtils.getDigest("SHA-256");
		}

		// Token: 0x06000159 RID: 345 RVA: 0x00006610 File Offset: 0x00004810
		[LineNumberTable(471)]
		[MethodImpl(8)]
		public static byte[] sha256(byte[] data)
		{
			return DigestUtils.getSha256Digest().digest(data);
		}

		// Token: 0x0600015A RID: 346 RVA: 0x0000661F File Offset: 0x0000481F
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(488)]
		[MethodImpl(8)]
		public static byte[] sha256(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getSha256Digest(), data);
		}

		// Token: 0x0600015B RID: 347 RVA: 0x0000662E File Offset: 0x0000482E
		[LineNumberTable(503)]
		[MethodImpl(8)]
		public static byte[] sha256(string data)
		{
			return DigestUtils.sha256(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x0600015C RID: 348 RVA: 0x0000663D File Offset: 0x0000483D
		[LineNumberTable(162)]
		[MethodImpl(8)]
		public static MessageDigest getSha384Digest()
		{
			return DigestUtils.getDigest("SHA-384");
		}

		// Token: 0x0600015D RID: 349 RVA: 0x0000664B File Offset: 0x0000484B
		[LineNumberTable(565)]
		[MethodImpl(8)]
		public static byte[] sha384(byte[] data)
		{
			return DigestUtils.getSha384Digest().digest(data);
		}

		// Token: 0x0600015E RID: 350 RVA: 0x0000665A File Offset: 0x0000485A
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(582)]
		[MethodImpl(8)]
		public static byte[] sha384(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getSha384Digest(), data);
		}

		// Token: 0x0600015F RID: 351 RVA: 0x00006669 File Offset: 0x00004869
		[LineNumberTable(597)]
		[MethodImpl(8)]
		public static byte[] sha384(string data)
		{
			return DigestUtils.sha384(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x06000160 RID: 352 RVA: 0x00006678 File Offset: 0x00004878
		[LineNumberTable(178)]
		[MethodImpl(8)]
		public static MessageDigest getSha512Digest()
		{
			return DigestUtils.getDigest("SHA-512");
		}

		// Token: 0x06000161 RID: 353 RVA: 0x00006686 File Offset: 0x00004886
		[LineNumberTable(659)]
		[MethodImpl(8)]
		public static byte[] sha512(byte[] data)
		{
			return DigestUtils.getSha512Digest().digest(data);
		}

		// Token: 0x06000162 RID: 354 RVA: 0x00006695 File Offset: 0x00004895
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(676)]
		[MethodImpl(8)]
		public static byte[] sha512(InputStream data)
		{
			return DigestUtils.digest(DigestUtils.getSha512Digest(), data);
		}

		// Token: 0x06000163 RID: 355 RVA: 0x000066A4 File Offset: 0x000048A4
		[LineNumberTable(691)]
		[MethodImpl(8)]
		public static byte[] sha512(string data)
		{
			return DigestUtils.sha512(DigestUtils.getBytesUtf8(data));
		}

		// Token: 0x06000164 RID: 356 RVA: 0x000066B3 File Offset: 0x000048B3
		[LineNumberTable(430)]
		[MethodImpl(8)]
		public static string sha1Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.sha1(data));
		}

		// Token: 0x06000165 RID: 357 RVA: 0x000066C2 File Offset: 0x000048C2
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(444)]
		[MethodImpl(8)]
		public static string sha1Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.sha1(data));
		}

		// Token: 0x06000166 RID: 358 RVA: 0x000066D1 File Offset: 0x000048D1
		[LineNumberTable(456)]
		[MethodImpl(8)]
		public static string sha1Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.sha1(data));
		}

		// Token: 0x06000167 RID: 359 RVA: 0x000066E0 File Offset: 0x000048E0
		[LineNumberTable(33)]
		[MethodImpl(8)]
		public DigestUtils()
		{
		}

		// Token: 0x06000168 RID: 360 RVA: 0x000066EA File Offset: 0x000048EA
		[Obsolete]
		[LineNumberTable(191)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static MessageDigest getShaDigest()
		{
			return DigestUtils.getSha1Digest();
		}

		// Token: 0x06000169 RID: 361 RVA: 0x000066F3 File Offset: 0x000048F3
		[LineNumberTable(241)]
		[MethodImpl(8)]
		public static string md2Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.md2(data));
		}

		// Token: 0x0600016A RID: 362 RVA: 0x00006702 File Offset: 0x00004902
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(255)]
		[MethodImpl(8)]
		public static string md2Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.md2(data));
		}

		// Token: 0x0600016B RID: 363 RVA: 0x00006711 File Offset: 0x00004911
		[LineNumberTable(267)]
		[MethodImpl(8)]
		public static string md2Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.md2(data));
		}

		// Token: 0x0600016C RID: 364 RVA: 0x00006720 File Offset: 0x00004920
		[LineNumberTable(314)]
		[MethodImpl(8)]
		public static string md5Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.md5(data));
		}

		// Token: 0x0600016D RID: 365 RVA: 0x0000672F File Offset: 0x0000492F
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(328)]
		[MethodImpl(8)]
		public static string md5Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.md5(data));
		}

		// Token: 0x0600016E RID: 366 RVA: 0x0000673E File Offset: 0x0000493E
		[LineNumberTable(339)]
		[MethodImpl(8)]
		public static string md5Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.md5(data));
		}

		// Token: 0x0600016F RID: 367 RVA: 0x0000674D File Offset: 0x0000494D
		[Obsolete]
		[LineNumberTable(352)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static byte[] sha(byte[] data)
		{
			return DigestUtils.sha1(data);
		}

		// Token: 0x06000170 RID: 368 RVA: 0x00006757 File Offset: 0x00004957
		[Throws(new string[] { "java.io.IOException" })]
		[Obsolete]
		[LineNumberTable(368)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static byte[] sha(InputStream data)
		{
			return DigestUtils.sha1(data);
		}

		// Token: 0x06000171 RID: 369 RVA: 0x00006761 File Offset: 0x00004961
		[Obsolete]
		[LineNumberTable(381)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static byte[] sha(string data)
		{
			return DigestUtils.sha1(data);
		}

		// Token: 0x06000172 RID: 370 RVA: 0x0000676B File Offset: 0x0000496B
		[LineNumberTable(518)]
		[MethodImpl(8)]
		public static string sha256Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.sha256(data));
		}

		// Token: 0x06000173 RID: 371 RVA: 0x0000677A File Offset: 0x0000497A
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(535)]
		[MethodImpl(8)]
		public static string sha256Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.sha256(data));
		}

		// Token: 0x06000174 RID: 372 RVA: 0x00006789 File Offset: 0x00004989
		[LineNumberTable(550)]
		[MethodImpl(8)]
		public static string sha256Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.sha256(data));
		}

		// Token: 0x06000175 RID: 373 RVA: 0x00006798 File Offset: 0x00004998
		[LineNumberTable(612)]
		[MethodImpl(8)]
		public static string sha384Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.sha384(data));
		}

		// Token: 0x06000176 RID: 374 RVA: 0x000067A7 File Offset: 0x000049A7
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(629)]
		[MethodImpl(8)]
		public static string sha384Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.sha384(data));
		}

		// Token: 0x06000177 RID: 375 RVA: 0x000067B6 File Offset: 0x000049B6
		[LineNumberTable(644)]
		[MethodImpl(8)]
		public static string sha384Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.sha384(data));
		}

		// Token: 0x06000178 RID: 376 RVA: 0x000067C5 File Offset: 0x000049C5
		[LineNumberTable(706)]
		[MethodImpl(8)]
		public static string sha512Hex(byte[] data)
		{
			return Hex.encodeHexString(DigestUtils.sha512(data));
		}

		// Token: 0x06000179 RID: 377 RVA: 0x000067D4 File Offset: 0x000049D4
		[Throws(new string[] { "java.io.IOException" })]
		[LineNumberTable(723)]
		[MethodImpl(8)]
		public static string sha512Hex(InputStream data)
		{
			return Hex.encodeHexString(DigestUtils.sha512(data));
		}

		// Token: 0x0600017A RID: 378 RVA: 0x000067E3 File Offset: 0x000049E3
		[LineNumberTable(738)]
		[MethodImpl(8)]
		public static string sha512Hex(string data)
		{
			return Hex.encodeHexString(DigestUtils.sha512(data));
		}

		// Token: 0x0600017B RID: 379 RVA: 0x000067F2 File Offset: 0x000049F2
		[Obsolete]
		[LineNumberTable(751)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static string shaHex(byte[] data)
		{
			return DigestUtils.sha1Hex(data);
		}

		// Token: 0x0600017C RID: 380 RVA: 0x000067FC File Offset: 0x000049FC
		[Throws(new string[] { "java.io.IOException" })]
		[Obsolete]
		[LineNumberTable(767)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static string shaHex(InputStream data)
		{
			return DigestUtils.sha1Hex(data);
		}

		// Token: 0x0600017D RID: 381 RVA: 0x00006806 File Offset: 0x00004A06
		[Obsolete]
		[LineNumberTable(780)]
		[Deprecated(new object[] { 64, "Ljava/lang/Deprecated;" })]
		[MethodImpl(8)]
		public static string shaHex(string data)
		{
			return DigestUtils.sha1Hex(data);
		}

		// Token: 0x0600017E RID: 382 RVA: 0x00006810 File Offset: 0x00004A10
		[LineNumberTable(new byte[] { 162, 168, 103 })]
		[MethodImpl(8)]
		public static MessageDigest updateDigest(MessageDigest messageDigest, byte[] valueToDigest)
		{
			messageDigest.update(valueToDigest);
			return messageDigest;
		}

		// Token: 0x0600017F RID: 383 RVA: 0x0000681A File Offset: 0x00004A1A
		[LineNumberTable(new byte[] { 162, 183, 108 })]
		[MethodImpl(8)]
		public static MessageDigest updateDigest(MessageDigest messageDigest, string valueToDigest)
		{
			messageDigest.update(DigestUtils.getBytesUtf8(valueToDigest));
			return messageDigest;
		}

		// Token: 0x0400008C RID: 140
		private const int STREAM_BUFFER_LENGTH = 1024;
	}
}
