using System;
using System.Runtime.CompilerServices;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.util.encryption
{
	// Token: 0x02000061 RID: 97
	public class ClassBookEncryption : Object
	{
		// Token: 0x06000349 RID: 841 RVA: 0x00011B50 File Offset: 0x0000FD50
		[LineNumberTable(new byte[]
		{
			159, 181, 232, 48, 235, 82, 136, 175, 108, 226,
			69
		})]
		[MethodImpl(8)]
		public ClassBookEncryption(int algorithm)
		{
			this.mPassword = "Cls-Bok-EDC-@)12";
			ClassBookEncryption.mAlgorithm = algorithm;
			if (ClassBookEncryption.mAlgorithm == 1)
			{
				ClassBookEncryption.mBaseEncrypt = new RC4();
			}
		}

		// Token: 0x0600034A RID: 842 RVA: 0x00011B98 File Offset: 0x0000FD98
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 21, 123 })]
		[MethodImpl(8)]
		public unsafe virtual string decryptString(string encryptedText)
		{
			BaseEncrypt baseEncrypt = ClassBookEncryption.mBaseEncrypt;
			delegate*<string> system.String_u0020() = ldvirtftn(ToString);
			return baseEncrypt.decryptString(encryptedText, "Cls-Bok-EDC-@)12");
		}

		// Token: 0x0600034B RID: 843 RVA: 0x00011BC4 File Offset: 0x0000FDC4
		[LineNumberTable(new byte[]
		{
			92, 135, 214, 223, 19, 102, 255, 14, 72, 143,
			233, 56, 98, 245, 69, 131, 230, 58, 98, 181,
			131, 230, 60, 98, 117, 131, 98
		})]
		[MethodImpl(8)]
		public virtual void writeToFile(string filePath, string data)
		{
			UnsupportedEncodingException ex2;
			IOException ex4;
			Exception ex7;
			try
			{
				try
				{
					try
					{
						try
						{
							File file = new File(filePath);
							BufferedWriter bufferedWriter = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file), "UTF-8"));
							Writer writer = bufferedWriter;
							CharSequence charSequence;
							charSequence.__<ref> = data;
							Writer writer2 = writer.append(charSequence);
							object obj = "\r\n";
							charSequence.__<ref> = obj;
							writer2.append(charSequence);
							bufferedWriter.flush();
							bufferedWriter.close();
						}
						catch (UnsupportedEncodingException ex)
						{
							ex2 = ByteCodeHelper.MapException<UnsupportedEncodingException>(ex, ByteCodeHelper.MapFlags.NoRemapping);
							goto IL_0085;
						}
					}
					catch (IOException ex3)
					{
						ex4 = ByteCodeHelper.MapException<IOException>(ex3, ByteCodeHelper.MapFlags.NoRemapping);
						goto IL_0089;
					}
				}
				catch (Exception ex5)
				{
					Exception ex6 = ByteCodeHelper.MapException<Exception>(ex5, ByteCodeHelper.MapFlags.None);
					if (ex6 == null)
					{
						throw;
					}
					ex7 = ex6;
					goto IL_008D;
				}
			}
			catch
			{
				throw;
			}
			return;
			IL_0085:
			UnsupportedEncodingException ex8 = ex2;
			try
			{
				UnsupportedEncodingException ex9 = ex8;
				java.lang.System.@out.println(Throwable.instancehelper_getMessage(ex9));
			}
			catch
			{
				throw;
			}
			return;
			IL_0089:
			IOException ex10 = ex4;
			try
			{
				IOException ex11 = ex10;
				java.lang.System.@out.println(Throwable.instancehelper_getMessage(ex11));
			}
			catch
			{
				throw;
			}
			return;
			IL_008D:
			Exception ex12 = ex7;
			try
			{
				Exception ex13 = ex12;
				java.lang.System.@out.println(Throwable.instancehelper_getMessage(ex13));
			}
			catch
			{
				throw;
			}
		}

		// Token: 0x0600034C RID: 844 RVA: 0x00011D20 File Offset: 0x0000FF20
		[LineNumberTable(new byte[] { 159, 173, 232, 56, 235, 73 })]
		[MethodImpl(8)]
		public ClassBookEncryption()
		{
			this.mPassword = "Cls-Bok-EDC-@)12";
		}

		// Token: 0x0600034D RID: 845 RVA: 0x00011D40 File Offset: 0x0000FF40
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 11, 123 })]
		[MethodImpl(8)]
		public unsafe virtual string encryptString(string plainText)
		{
			BaseEncrypt baseEncrypt = ClassBookEncryption.mBaseEncrypt;
			delegate*<string> system.String_u0020() = ldvirtftn(ToString);
			return baseEncrypt.encryptString(plainText, "Cls-Bok-EDC-@)12");
		}

		// Token: 0x0600034E RID: 846 RVA: 0x00011D6C File Offset: 0x0000FF6C
		[LineNumberTable(new byte[]
		{
			33, 98, 130, 102, 118, 118, 98, 104, 100, 103,
			138, 155, 103, 136, 102, 102, 125, 97
		})]
		[MethodImpl(8)]
		public unsafe virtual bool encryptIvonaCer(string src, string des)
		{
			int num2;
			try
			{
				BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(new FileInputStream(src), "UTF-8"));
				BufferedWriter bufferedWriter = new BufferedWriter(new OutputStreamWriter(new FileOutputStream(des), "UTF-8"));
				int num = 0;
				while (bufferedReader.ready())
				{
					num++;
					string text = bufferedReader.readLine();
					if (num <= 19 || num >= 24)
					{
						BaseEncrypt baseEncrypt = ClassBookEncryption.mBaseEncrypt;
						string text2 = text;
						delegate*<string> system.String_u0020() = ldvirtftn(ToString);
						text = baseEncrypt.encryptString(text2, "Cls-Bok-EDC-@)12");
					}
					bufferedWriter.write(text);
					bufferedWriter.newLine();
				}
				bufferedWriter.close();
				bufferedReader.close();
				num2 = 1;
			}
			catch (Exception ex)
			{
				if (ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				return false;
			}
			return num2 != 0;
		}

		// Token: 0x0600034F RID: 847 RVA: 0x00011E34 File Offset: 0x00010034
		[LineNumberTable(new byte[]
		{
			65, 98, 130, 102, 108, 108, 98, 104, 100, 103,
			138, 155, 103, 136, 102, 102, 125, 97
		})]
		[MethodImpl(8)]
		public unsafe virtual bool decryptIvonaCer(string src, string des)
		{
			int num2;
			try
			{
				BufferedReader bufferedReader = new BufferedReader(new FileReader(src));
				BufferedWriter bufferedWriter = new BufferedWriter(new FileWriter(des));
				int num = 0;
				while (bufferedReader.ready())
				{
					num++;
					string text = bufferedReader.readLine();
					if (num <= 19 || num >= 24)
					{
						BaseEncrypt baseEncrypt = ClassBookEncryption.mBaseEncrypt;
						string text2 = text;
						delegate*<string> system.String_u0020() = ldvirtftn(ToString);
						text = baseEncrypt.decryptString(text2, "Cls-Bok-EDC-@)12");
					}
					bufferedWriter.write(text);
					bufferedWriter.newLine();
				}
				bufferedWriter.close();
				bufferedReader.close();
				num2 = 1;
			}
			catch (Exception ex)
			{
				if (ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				return false;
			}
			return num2 != 0;
		}

		// Token: 0x06000350 RID: 848 RVA: 0x00011EE8 File Offset: 0x000100E8
		[LineNumberTable(new byte[] { 124, 231, 70, 170, 255, 4, 73, 2, 97, 134 })]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				ClassBookEncryption classBookEncryption = new ClassBookEncryption(1);
				string text = classBookEncryption.decryptString(args[0]);
				classBookEncryption.writeToFile("C:\\cbout.txt", text);
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
			return;
			IL_0031:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x04000145 RID: 325
		protected internal static BaseEncrypt mBaseEncrypt = null;

		// Token: 0x04000146 RID: 326
		[Modifiers(Modifiers.Private | Modifiers.Final)]
		private string mPassword;

		// Token: 0x04000147 RID: 327
		private static int mAlgorithm = 0;

		// Token: 0x04000148 RID: 328
		public const int RC4 = 1;
	}
}
