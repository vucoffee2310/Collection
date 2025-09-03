using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.util.codec.binary;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.security;
using javax.crypto;
using javax.crypto.spec;

namespace com.edc.classbook.util.encryption
{
	// Token: 0x02000062 RID: 98
	public class RC4 : BaseEncrypt
	{
		// Token: 0x06000352 RID: 850 RVA: 0x00011F52 File Offset: 0x00010152
		[LineNumberTable(24)]
		[MethodImpl(8)]
		public RC4()
		{
		}

		// Token: 0x06000353 RID: 851 RVA: 0x00011F5C File Offset: 0x0001015C
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			48, 226, 69, 171, 104, 255, 0, 69, 226, 61,
			129, 135
		})]
		[MethodImpl(8)]
		public static byte[] encrypt(byte[] text, SecretKey key)
		{
			byte[] array;
			Exception ex3;
			try
			{
				Cipher instance = Cipher.getInstance("RC4");
				instance.init(1, key);
				array = instance.doFinal(text);
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0031;
			}
			return array;
			IL_0031:
			Exception ex4 = ex3;
			throw Throwable.__<unmap>(ex4);
		}

		// Token: 0x06000354 RID: 852 RVA: 0x00011FB8 File Offset: 0x000101B8
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			75, 194, 107, 104, 255, 0, 69, 226, 61, 129,
			135
		})]
		[MethodImpl(8)]
		public static byte[] decrypt(byte[] text, SecretKey key)
		{
			byte[] array;
			Exception ex3;
			try
			{
				Cipher instance = Cipher.getInstance("RC4");
				instance.init(2, key);
				array = instance.doFinal(text);
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0031;
			}
			return array;
			IL_0031:
			Exception ex4 = ex3;
			throw Throwable.__<unmap>(ex4);
		}

		// Token: 0x06000355 RID: 853 RVA: 0x00012014 File Offset: 0x00010214
		[Throws(new string[] { "java.security.NoSuchAlgorithmException" })]
		[LineNumberTable(179)]
		[MethodImpl(8)]
		public override SecretKey generateKeyFromString(string password)
		{
			return new SecretKeySpec(String.instancehelper_getBytes(password), "RC4");
		}

		// Token: 0x06000356 RID: 854 RVA: 0x00012028 File Offset: 0x00010228
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 30, 114, 254, 69, 226, 61, 129, 135 })]
		[MethodImpl(8)]
		public static string encrypt(string text, SecretKey key)
		{
			string text2;
			Exception ex3;
			try
			{
				byte[] array = RC4.encrypt(String.instancehelper_getBytes(text, "UTF-8"), key);
				text2 = Base64.encodeBase64String(array);
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_002D;
			}
			return text2;
			IL_002D:
			Exception ex4 = ex3;
			throw Throwable.__<unmap>(ex4);
		}

		// Token: 0x06000357 RID: 855 RVA: 0x00012080 File Offset: 0x00010280
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 104, 109, 255, 4, 69, 226, 61, 129, 135 })]
		[MethodImpl(8)]
		public static string decrypt(string text, SecretKey key)
		{
			string text2;
			Exception ex3;
			try
			{
				byte[] array = RC4.decrypt(Base64.decodeBase64(text), key);
				text2 = String.newhelper(array, "UTF8");
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_002D;
			}
			return text2;
			IL_002D:
			Exception ex4 = ex3;
			throw Throwable.__<unmap>(ex4);
		}

		// Token: 0x06000358 RID: 856 RVA: 0x000120D8 File Offset: 0x000102D8
		[Throws(new string[] { "java.security.NoSuchAlgorithmException" })]
		[LineNumberTable(36)]
		[MethodImpl(8)]
		public static SecretKey generateKeyFromStringS(string password)
		{
			return new SecretKeySpec(String.instancehelper_getBytes(password), "RC4");
		}

		// Token: 0x06000359 RID: 857 RVA: 0x000120EC File Offset: 0x000102EC
		[LineNumberTable(new byte[] { 13, 135 })]
		[MethodImpl(8)]
		public static string getKeyAsString(Key key)
		{
			byte[] encoded = key.getEncoded();
			return Base64.encodeBase64String(encoded);
		}

		// Token: 0x0600035A RID: 858 RVA: 0x00012108 File Offset: 0x00010308
		[Throws(new string[] { "java.security.NoSuchAlgorithmException" })]
		[LineNumberTable(new byte[] { 159, 188, 107, 107, 103, 119, 98 })]
		[MethodImpl(8)]
		public static SecretKey generateKey()
		{
			SecretKey secretKey2;
			NoSuchAlgorithmException ex2;
			try
			{
				KeyGenerator instance = KeyGenerator.getInstance("RC4");
				instance.init(128);
				SecretKey secretKey = instance.generateKey();
				secretKey2 = secretKey;
			}
			catch (NoSuchAlgorithmException ex)
			{
				ex2 = ByteCodeHelper.MapException<NoSuchAlgorithmException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
				goto IL_0030;
			}
			return secretKey2;
			IL_0030:
			NoSuchAlgorithmException ex3 = ex2;
			throw Throwable.__<unmap>(ex3);
		}

		// Token: 0x0600035B RID: 859 RVA: 0x00012164 File Offset: 0x00010364
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 160, 74, 104, 104 })]
		[MethodImpl(8)]
		public override string encryptString(string plainText, string password)
		{
			SecretKey secretKey = this.generateKeyFromString(password);
			return RC4.encrypt(plainText, secretKey);
		}

		// Token: 0x0600035C RID: 860 RVA: 0x00012184 File Offset: 0x00010384
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 160, 86, 104, 104 })]
		[MethodImpl(8)]
		public override string decryptString(string encryptedText, string password)
		{
			SecretKey secretKey = this.generateKeyFromString(password);
			return RC4.decrypt(encryptedText, secretKey);
		}

		// Token: 0x0600035D RID: 861 RVA: 0x000121A4 File Offset: 0x000103A4
		[LineNumberTable(new byte[]
		{
			160, 94, 107, 107, 144, 103, 127, 5, 134, 127,
			5, 105, 127, 6, 106, 127, 6, 140, 105, 142,
			105, 223, 1, 2, 98, 145
		})]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				SecretKey secretKey = RC4.generateKeyFromStringS("Cls-Bok-edc-@)12");
				SecretKey secretKey2 = RC4.generateKeyFromStringS("Cls-Bok-edc-@)12");
				java.lang.System.@out.println(secretKey.getAlgorithm());
				string keyAsString = RC4.getKeyAsString(secretKey);
				java.lang.System.@out.println(new StringBuilder().append("sKey: ").append(keyAsString).toString());
				string text = "abc em s? tï¿½ m?";
				java.lang.System.@out.println(new StringBuilder().append("plainText: ").append(text).toString());
				string text2 = RC4.encrypt(text, secretKey);
				java.lang.System.@out.println(new StringBuilder().append("encrypted: ").append(text2).toString());
				string text3 = RC4.decrypt(text2, secretKey2);
				java.lang.System.@out.println(new StringBuilder().append("decrypted: ").append(text3).toString());
				File file = new File("d:/unicodetest.txt");
				FileOutputStream fileOutputStream = new FileOutputStream(file);
				OutputStreamWriter outputStreamWriter = new OutputStreamWriter(fileOutputStream, "UTF-8");
				outputStreamWriter.write(text3);
				outputStreamWriter.close();
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_0120;
			}
			return;
			IL_0120:
			Exception ex4 = ex3;
			java.lang.System.@out.println(Throwable.instancehelper_toString(ex4));
		}

		// Token: 0x04000149 RID: 329
		protected internal const string ALGORITHM = "RC4";
	}
}
