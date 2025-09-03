using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.lang;
using java.security;
using java.util;
using java.util.regex;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000026 RID: 38
	public class Sha2Crypt : Object
	{
		// Token: 0x06000189 RID: 393 RVA: 0x00006C01 File Offset: 0x00004E01
		[MethodImpl(8)]
		public static void __<clinit>()
		{
		}

		// Token: 0x0600018A RID: 394 RVA: 0x00006C03 File Offset: 0x00004E03
		[LineNumberTable(509)]
		[MethodImpl(8)]
		public static string sha512Crypt(byte[] keyBytes)
		{
			return Sha2Crypt.sha512Crypt(keyBytes, null);
		}

		// Token: 0x0600018B RID: 395 RVA: 0x00006C0E File Offset: 0x00004E0E
		[LineNumberTable(new byte[] { 161, 153, 99, 159, 2 })]
		[MethodImpl(8)]
		public static string sha512Crypt(byte[] keyBytes, string salt)
		{
			if (salt == null)
			{
				salt = new StringBuilder().append("$6$").append(B64.getRandomSalt(8)).toString();
			}
			return Sha2Crypt.sha2Crypt(keyBytes, salt, "$6$", 64, "SHA-512");
		}

		// Token: 0x0600018C RID: 396 RVA: 0x00006C49 File Offset: 0x00004E49
		[LineNumberTable(new byte[] { 44, 99, 159, 2 })]
		[MethodImpl(8)]
		public static string sha256Crypt(byte[] keyBytes, string salt)
		{
			if (salt == null)
			{
				salt = new StringBuilder().append("$5$").append(B64.getRandomSalt(8)).toString();
			}
			return Sha2Crypt.sha2Crypt(keyBytes, salt, "$5$", 32, "SHA-256");
		}

		// Token: 0x0600018D RID: 397 RVA: 0x00006C84 File Offset: 0x00004E84
		[LineNumberTable(new byte[]
		{
			77, 163, 102, 98, 99, 176, 125, 109, 159, 6,
			106, 110, 118, 130, 106, 110, 197, 233, 70, 232,
			79, 233, 71, 233, 70, 232, 70, 233, 70, 232,
			70, 233, 74, 100, 101, 107, 232, 69, 236, 80,
			100, 101, 102, 141, 136, 232, 71, 233, 70, 233,
			73, 104, 40, 232, 72, 233, 76, 104, 99, 103,
			109, 136, 240, 70, 233, 73, 110, 41, 232, 72,
			233, 77, 105, 99, 104, 109, 136, 241, 77, 237,
			69, 233, 71, 102, 141, 235, 71, 111, 236, 71,
			111, 235, 72, 102, 141, 235, 71, 233, 15, 235,
			160, 67, 104, 99, 109, 105, 141, 106, 237, 90,
			104, 118, 118, 118, 118, 118, 118, 118, 118, 118,
			119, 152, 118, 118, 118, 118, 118, 118, 118, 118,
			118, 119, 119, 119, 119, 119, 119, 119, 119, 119,
			119, 119, 119, 239, 72, 104, 104, 104, 103, 103,
			103, 136
		})]
		[MethodImpl(8)]
		private static string sha2Crypt(byte[] A_0, string A_1, string A_2, int A_3, string A_4)
		{
			int num = A_0.Length;
			int num2 = 5000;
			int num3 = 0;
			if (A_1 == null)
			{
				string text = "Salt must not be null";
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text);
			}
			Pattern salt_PATTERN = Sha2Crypt.SALT_PATTERN;
			CharSequence charSequence;
			charSequence.__<ref> = A_1;
			Matcher matcher = salt_PATTERN.matcher(charSequence);
			if (matcher == null || !matcher.find())
			{
				string text2 = new StringBuilder().append("Invalid salt value: ").append(A_1).toString();
				Throwable.__<suppressFillInStackTrace>();
				throw new IllegalArgumentException(text2);
			}
			if (matcher.group(3) != null)
			{
				num2 = Integer.parseInt(matcher.group(3));
				num2 = Math.max(1000, Math.min(999999999, num2));
				num3 = 1;
			}
			string text3 = matcher.group(4);
			byte[] array = String.instancehelper_getBytes(text3, Charsets.__<>UTF_8);
			int num4 = array.Length;
			MessageDigest messageDigest = DigestUtils.getDigest(A_4);
			messageDigest.update(A_0);
			messageDigest.update(array);
			MessageDigest messageDigest2 = DigestUtils.getDigest(A_4);
			messageDigest2.update(A_0);
			messageDigest2.update(array);
			messageDigest2.update(A_0);
			byte[] array2 = messageDigest2.digest();
			int i;
			for (i = A_0.Length; i > A_3; i -= A_3)
			{
				messageDigest.update(array2, 0, A_3);
			}
			messageDigest.update(array2, 0, i);
			for (i = A_0.Length; i > 0; i >>= 1)
			{
				if ((i & 1) != 0)
				{
					messageDigest.update(array2, 0, A_3);
				}
				else
				{
					messageDigest.update(A_0);
				}
			}
			array2 = messageDigest.digest();
			messageDigest2 = DigestUtils.getDigest(A_4);
			for (int j = 1; j <= num; j++)
			{
				messageDigest2.update(A_0);
			}
			byte[] array3 = messageDigest2.digest();
			byte[] array4 = new byte[num];
			int k;
			for (k = 0; k < num - A_3; k += A_3)
			{
				ByteCodeHelper.arraycopy_primitive_1(array3, 0, array4, k, A_3);
			}
			ByteCodeHelper.arraycopy_primitive_1(array3, 0, array4, k, num - k);
			messageDigest2 = DigestUtils.getDigest(A_4);
			for (int l = 1; l <= (int)(16 + array2[0]); l++)
			{
				messageDigest2.update(array);
			}
			array3 = messageDigest2.digest();
			byte[] array5 = new byte[num4];
			for (k = 0; k < num4 - A_3; k += A_3)
			{
				ByteCodeHelper.arraycopy_primitive_1(array3, 0, array5, k, A_3);
			}
			ByteCodeHelper.arraycopy_primitive_1(array3, 0, array5, k, num4 - k);
			for (int m = 0; m <= num2 - 1; m++)
			{
				messageDigest = DigestUtils.getDigest(A_4);
				if ((m & 1) != 0)
				{
					messageDigest.update(array4, 0, num);
				}
				else
				{
					messageDigest.update(array2, 0, A_3);
				}
				bool flag = m != 0;
				int num5 = 3;
				if (num5 != -1 && (flag ? 1 : 0) % num5 != 0)
				{
					messageDigest.update(array5, 0, num4);
				}
				bool flag2 = m != 0;
				int num6 = 7;
				if (num6 != -1 && (flag2 ? 1 : 0) % num6 != 0)
				{
					messageDigest.update(array4, 0, num);
				}
				if ((m & 1) != 0)
				{
					messageDigest.update(array2, 0, A_3);
				}
				else
				{
					messageDigest.update(array4, 0, num);
				}
				array2 = messageDigest.digest();
			}
			StringBuilder stringBuilder = new StringBuilder(A_2);
			if (num3 != 0)
			{
				stringBuilder.append("rounds=");
				stringBuilder.append(num2);
				stringBuilder.append("$");
			}
			stringBuilder.append(text3);
			stringBuilder.append("$");
			if (A_3 == 32)
			{
				B64.b64from24bit(array2[0], array2[10], array2[20], 4, stringBuilder);
				B64.b64from24bit(array2[21], array2[1], array2[11], 4, stringBuilder);
				B64.b64from24bit(array2[12], array2[22], array2[2], 4, stringBuilder);
				B64.b64from24bit(array2[3], array2[13], array2[23], 4, stringBuilder);
				B64.b64from24bit(array2[24], array2[4], array2[14], 4, stringBuilder);
				B64.b64from24bit(array2[15], array2[25], array2[5], 4, stringBuilder);
				B64.b64from24bit(array2[6], array2[16], array2[26], 4, stringBuilder);
				B64.b64from24bit(array2[27], array2[7], array2[17], 4, stringBuilder);
				B64.b64from24bit(array2[18], array2[28], array2[8], 4, stringBuilder);
				B64.b64from24bit(array2[9], array2[19], array2[29], 4, stringBuilder);
				B64.b64from24bit(0, array2[31], array2[30], 3, stringBuilder);
			}
			else
			{
				B64.b64from24bit(array2[0], array2[21], array2[42], 4, stringBuilder);
				B64.b64from24bit(array2[22], array2[43], array2[1], 4, stringBuilder);
				B64.b64from24bit(array2[44], array2[2], array2[23], 4, stringBuilder);
				B64.b64from24bit(array2[3], array2[24], array2[45], 4, stringBuilder);
				B64.b64from24bit(array2[25], array2[46], array2[4], 4, stringBuilder);
				B64.b64from24bit(array2[47], array2[5], array2[26], 4, stringBuilder);
				B64.b64from24bit(array2[6], array2[27], array2[48], 4, stringBuilder);
				B64.b64from24bit(array2[28], array2[49], array2[7], 4, stringBuilder);
				B64.b64from24bit(array2[50], array2[8], array2[29], 4, stringBuilder);
				B64.b64from24bit(array2[9], array2[30], array2[51], 4, stringBuilder);
				B64.b64from24bit(array2[31], array2[52], array2[10], 4, stringBuilder);
				B64.b64from24bit(array2[53], array2[11], array2[32], 4, stringBuilder);
				B64.b64from24bit(array2[12], array2[33], array2[54], 4, stringBuilder);
				B64.b64from24bit(array2[34], array2[55], array2[13], 4, stringBuilder);
				B64.b64from24bit(array2[56], array2[14], array2[35], 4, stringBuilder);
				B64.b64from24bit(array2[15], array2[36], array2[57], 4, stringBuilder);
				B64.b64from24bit(array2[37], array2[58], array2[16], 4, stringBuilder);
				B64.b64from24bit(array2[59], array2[17], array2[38], 4, stringBuilder);
				B64.b64from24bit(array2[18], array2[39], array2[60], 4, stringBuilder);
				B64.b64from24bit(array2[40], array2[61], array2[19], 4, stringBuilder);
				B64.b64from24bit(array2[62], array2[20], array2[41], 4, stringBuilder);
				B64.b64from24bit(0, 0, array2[63], 2, stringBuilder);
			}
			Arrays.fill(array3, 0);
			Arrays.fill(array4, 0);
			Arrays.fill(array5, 0);
			messageDigest.reset();
			messageDigest2.reset();
			Arrays.fill(A_0, 0);
			Arrays.fill(array, 0);
			return stringBuilder.toString();
		}

		// Token: 0x0600018E RID: 398 RVA: 0x000072BD File Offset: 0x000054BD
		[LineNumberTable(41)]
		[MethodImpl(8)]
		public Sha2Crypt()
		{
		}

		// Token: 0x0600018F RID: 399 RVA: 0x000072C7 File Offset: 0x000054C7
		[LineNumberTable(80)]
		[MethodImpl(8)]
		public static string sha256Crypt(byte[] keyBytes)
		{
			return Sha2Crypt.sha256Crypt(keyBytes, null);
		}

		// Token: 0x04000097 RID: 151
		private const int ROUNDS_DEFAULT = 5000;

		// Token: 0x04000098 RID: 152
		private const int ROUNDS_MAX = 999999999;

		// Token: 0x04000099 RID: 153
		private const int ROUNDS_MIN = 1000;

		// Token: 0x0400009A RID: 154
		private const string ROUNDS_PREFIX = "rounds=";

		// Token: 0x0400009B RID: 155
		private const int SHA256_BLOCKSIZE = 32;

		// Token: 0x0400009C RID: 156
		internal const string SHA256_PREFIX = "$5$";

		// Token: 0x0400009D RID: 157
		private const int SHA512_BLOCKSIZE = 64;

		// Token: 0x0400009E RID: 158
		internal const string SHA512_PREFIX = "$6$";

		// Token: 0x0400009F RID: 159
		[Modifiers(Modifiers.Private | Modifiers.Static | Modifiers.Final)]
		private static Pattern SALT_PATTERN = Pattern.compile("^\\$([56])\\$(rounds=(\\d+)\\$)?([\\.\\/a-zA-Z0-9]{1,16}).*");
	}
}
