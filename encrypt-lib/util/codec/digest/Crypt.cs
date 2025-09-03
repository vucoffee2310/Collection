using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using java.lang;

namespace com.edc.classbook.util.codec.digest
{
	// Token: 0x02000022 RID: 34
	public class Crypt : Object
	{
		// Token: 0x06000144 RID: 324 RVA: 0x00006418 File Offset: 0x00004618
		[LineNumberTable(new byte[] { 16, 99, 105, 109, 106, 109, 106, 109, 138 })]
		[MethodImpl(8)]
		public static string crypt(byte[] keyBytes, string salt)
		{
			if (salt == null)
			{
				return Sha2Crypt.sha512Crypt(keyBytes);
			}
			if (String.instancehelper_startsWith(salt, "$6$"))
			{
				return Sha2Crypt.sha512Crypt(keyBytes, salt);
			}
			if (String.instancehelper_startsWith(salt, "$5$"))
			{
				return Sha2Crypt.sha256Crypt(keyBytes, salt);
			}
			if (String.instancehelper_startsWith(salt, "$1$"))
			{
				return Md5Crypt.md5Crypt(keyBytes, salt);
			}
			return UnixCrypt.crypt(keyBytes, salt);
		}

		// Token: 0x06000145 RID: 325 RVA: 0x0000647F File Offset: 0x0000467F
		[LineNumberTable(149)]
		[MethodImpl(8)]
		public static string crypt(string key, string salt)
		{
			return Crypt.crypt(String.instancehelper_getBytes(key, Charsets.__<>UTF_8), salt);
		}

		// Token: 0x06000146 RID: 326 RVA: 0x00006494 File Offset: 0x00004694
		[LineNumberTable(31)]
		[MethodImpl(8)]
		public Crypt()
		{
		}

		// Token: 0x06000147 RID: 327 RVA: 0x0000649E File Offset: 0x0000469E
		[LineNumberTable(46)]
		[MethodImpl(8)]
		public static string crypt(byte[] keyBytes)
		{
			return Crypt.crypt(keyBytes, null);
		}

		// Token: 0x06000148 RID: 328 RVA: 0x000064A9 File Offset: 0x000046A9
		[LineNumberTable(92)]
		[MethodImpl(8)]
		public static string crypt(string key)
		{
			return Crypt.crypt(key, null);
		}
	}
}
