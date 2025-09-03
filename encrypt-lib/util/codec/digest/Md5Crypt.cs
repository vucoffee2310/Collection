using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;
using java.security;
using java.util;
using java.util.regex;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000024 RID: 36
	public class Md5Crypt : Object
	{
		// Token: 0x06000180 RID: 384 RVA: 0x00006829 File Offset: 0x00004A29
		[LineNumberTable(148)]
		[MethodImpl(8)]
		public static string md5Crypt(byte[] keyBytes, string salt)
		{
			return Md5Crypt.md5Crypt(keyBytes, salt, "$1$");
		}

		// Token: 0x06000181 RID: 385 RVA: 0x00006839 File Offset: 0x00004A39
		[LineNumberTable(new byte[] { 32, 112, 156 })]
		[MethodImpl(8)]
		public static string apr1Crypt(byte[] keyBytes, string salt)
		{
			if (salt != null && !String.instancehelper_startsWith(salt, "$apr1$"))
			{
				salt = new StringBuilder().append("$apr1$").append(salt).toString();
			}
			return Md5Crypt.md5Crypt(keyBytes, salt, "$apr1$");
		}

		// Token: 0x06000182 RID: 386 RVA: 0x00006878 File Offset: 0x00004A78
		[LineNumberTable(new byte[]
		{
			112, 195, 99, 140, 127, 61, 122, 109, 159, 6,
			137, 141, 231, 69, 232, 69, 242, 69, 233, 69,
			103, 104, 105, 104, 105, 99, 101, 118, 233, 70,
			232, 69, 99, 99, 101, 103, 142, 139, 232, 70,
			127, 8, 233, 70, 111, 103, 102, 138, 172, 111,
			169, 111, 168, 102, 142, 136, 233, 43, 235, 91,
			117, 117, 117, 118, 117, 239, 70, 103, 103, 103,
			104, 136
		})]
		[MethodImpl(8)]
		public static string md5Crypt(byte[] keyBytes, string salt, string prefix)
		{
			int num = keyBytes.Length;
			string text;
			if (salt == null)
			{
				text = B64.getRandomSalt(8);
			}
			else
			{
				StringBuilder stringBuilder = new StringBuilder().append("^");
				object obj = "$";
				object obj2 = "\\$";
				object obj3 = obj;
				CharSequence charSequence;
				charSequence.__<ref> = obj3;
				CharSequence charSequence2 = charSequence;
				obj3 = obj2;
				charSequence.__<ref> = obj3;
				Pattern pattern = Pattern.compile(stringBuilder.append(String.instancehelper_replace(prefix, charSequence2, charSequence)).append("([\\.\\/a-zA-Z0-9]{1,8}).*").toString());
				Pattern pattern2 = pattern;
				charSequence.__<ref> = salt;
				Matcher matcher = pattern2.matcher(charSequence);
				if (matcher == null || !matcher.find())
				{
					string text2 = new StringBuilder().append("Invalid salt value: ").append(salt).toString();
					Throwable.__<suppressFillInStackTrace>();
					throw new IllegalArgumentException(text2);
				}
				text = matcher.group(1);
			}
			byte[] array = String.instancehelper_getBytes(text, Charsets.__<>UTF_8);
			MessageDigest md5Digest = DigestUtils.getMd5Digest();
			md5Digest.update(keyBytes);
			md5Digest.update(String.instancehelper_getBytes(prefix, Charsets.__<>UTF_8));
			md5Digest.update(array);
			MessageDigest messageDigest = DigestUtils.getMd5Digest();
			messageDigest.update(keyBytes);
			messageDigest.update(array);
			messageDigest.update(keyBytes);
			byte[] array2 = messageDigest.digest();
			int i;
			for (i = num; i > 0; i += -16)
			{
				md5Digest.update(array2, 0, (i <= 16) ? i : 16);
			}
			Arrays.fill(array2, 0);
			i = num;
			int num2 = 0;
			while (i > 0)
			{
				if ((i & 1) == 1)
				{
					md5Digest.update(array2[num2]);
				}
				else
				{
					md5Digest.update(keyBytes[num2]);
				}
				i >>= 1;
			}
			StringBuilder stringBuilder2 = new StringBuilder(new StringBuilder().append(prefix).append(text).append("$")
				.toString());
			array2 = md5Digest.digest();
			for (int j = 0; j < 1000; j++)
			{
				messageDigest = DigestUtils.getMd5Digest();
				if ((j & 1) != 0)
				{
					messageDigest.update(keyBytes);
				}
				else
				{
					messageDigest.update(array2, 0, 16);
				}
				bool flag = j != 0;
				int num3 = 3;
				if (num3 != -1 && (flag ? 1 : 0) % num3 != 0)
				{
					messageDigest.update(array);
				}
				bool flag2 = j != 0;
				int num4 = 7;
				if (num4 != -1 && (flag2 ? 1 : 0) % num4 != 0)
				{
					messageDigest.update(keyBytes);
				}
				if ((j & 1) != 0)
				{
					messageDigest.update(array2, 0, 16);
				}
				else
				{
					messageDigest.update(keyBytes);
				}
				array2 = messageDigest.digest();
			}
			B64.b64from24bit(array2[0], array2[6], array2[12], 4, stringBuilder2);
			B64.b64from24bit(array2[1], array2[7], array2[13], 4, stringBuilder2);
			B64.b64from24bit(array2[2], array2[8], array2[14], 4, stringBuilder2);
			B64.b64from24bit(array2[3], array2[9], array2[15], 4, stringBuilder2);
			B64.b64from24bit(array2[4], array2[10], array2[5], 4, stringBuilder2);
			B64.b64from24bit(0, 0, array2[11], 2, stringBuilder2);
			md5Digest.reset();
			messageDigest.reset();
			Arrays.fill(keyBytes, 0);
			Arrays.fill(array, 0);
			Arrays.fill(array2, 0);
			return stringBuilder2.toString();
		}

		// Token: 0x06000183 RID: 387 RVA: 0x00006B72 File Offset: 0x00004D72
		[LineNumberTable(69)]
		[MethodImpl(8)]
		public static string apr1Crypt(byte[] keyBytes)
		{
			return Md5Crypt.apr1Crypt(keyBytes, new StringBuilder().append("$apr1$").append(B64.getRandomSalt(8)).toString());
		}

		// Token: 0x06000184 RID: 388 RVA: 0x00006B9B File Offset: 0x00004D9B
		[LineNumberTable(48)]
		[MethodImpl(8)]
		public Md5Crypt()
		{
		}

		// Token: 0x06000185 RID: 389 RVA: 0x00006BA5 File Offset: 0x00004DA5
		[LineNumberTable(95)]
		[MethodImpl(8)]
		public static string apr1Crypt(string keyBytes)
		{
			return Md5Crypt.apr1Crypt(String.instancehelper_getBytes(keyBytes, Charsets.__<>UTF_8));
		}

		// Token: 0x06000186 RID: 390 RVA: 0x00006BB9 File Offset: 0x00004DB9
		[LineNumberTable(116)]
		[MethodImpl(8)]
		public static string apr1Crypt(string keyBytes, string salt)
		{
			return Md5Crypt.apr1Crypt(String.instancehelper_getBytes(keyBytes, Charsets.__<>UTF_8), salt);
		}

		// Token: 0x06000187 RID: 391 RVA: 0x00006BCE File Offset: 0x00004DCE
		[LineNumberTable(128)]
		[MethodImpl(8)]
		public static string md5Crypt(byte[] keyBytes)
		{
			return Md5Crypt.md5Crypt(keyBytes, new StringBuilder().append("$1$").append(B64.getRandomSalt(8)).toString());
		}

		// Token: 0x0400008D RID: 141
		internal const string APR1_PREFIX = "$apr1$";

		// Token: 0x0400008E RID: 142
		private const int BLOCKSIZE = 16;

		// Token: 0x0400008F RID: 143
		internal const string MD5_PREFIX = "$1$";

		// Token: 0x04000090 RID: 144
		private const int ROUNDS = 1000;
	}
}
