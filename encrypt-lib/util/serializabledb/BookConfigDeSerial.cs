using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.model;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;

namespace com.edc.classbook.util.serializabledb
{
	// Token: 0x02000063 RID: 99
	public class BookConfigDeSerial : Object
	{
		// Token: 0x0600035E RID: 862 RVA: 0x00012308 File Offset: 0x00010508
		[LineNumberTable(new byte[] { 159, 174, 232, 45, 103, 231, 83, 103 })]
		[MethodImpl(8)]
		public BookConfigDeSerial(InputStream input)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.inputStream = input;
		}

		// Token: 0x0600035F RID: 863 RVA: 0x00012334 File Offset: 0x00010534
		[LineNumberTable(new byte[]
		{
			159, 185, 162, 150, 113, 122, 129, 191, 3, 2,
			97, 166
		})]
		[MethodImpl(8)]
		public virtual BookConfigModel getBookConfig()
		{
			BookConfigModel bookConfigModel2;
			try
			{
				ObjectInputStream.__<clinit>();
				this.objInputStream = new ObjectInputStream(this.inputStream);
				BookConfigModel bookConfigModel = (BookConfigModel)this.objInputStream.readObject();
				bookConfigModel2 = bookConfigModel;
			}
			catch (Exception ex)
			{
				if (ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.Unused) == null)
				{
					throw;
				}
				goto IL_003F;
			}
			return bookConfigModel2;
			IL_003F:
			Exception ex4;
			try
			{
				this.objInputStream.close();
			}
			catch (Exception ex2)
			{
				Exception ex3 = ByteCodeHelper.MapException<Exception>(ex2, ByteCodeHelper.MapFlags.None);
				if (ex3 == null)
				{
					throw;
				}
				ex4 = ex3;
				goto IL_0063;
			}
			goto IL_006F;
			IL_0063:
			Exception ex5 = ex4;
			Throwable.instancehelper_printStackTrace(ex5);
			IL_006F:
			return new BookConfigModel();
		}

		// Token: 0x06000360 RID: 864 RVA: 0x000123D4 File Offset: 0x000105D4
		[Throws(new string[] { "java.io.FileNotFoundException" })]
		[LineNumberTable(new byte[] { 159, 164, 232, 55, 103, 231, 73, 103, 118 })]
		[MethodImpl(8)]
		public BookConfigDeSerial(string serialFile)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.serialFile = serialFile;
			FileInputStream.__<clinit>();
			this.inputStream = new FileInputStream(this.serialFile);
		}

		// Token: 0x06000361 RID: 865 RVA: 0x00012414 File Offset: 0x00010614
		[LineNumberTable(new byte[] { 13, 107, 103, 103, 191, 8, 2, 98, 135 })]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				FileInputStream fileInputStream = new FileInputStream("E:/bookdata/bookcfg.clsb");
				BookConfigDeSerial bookConfigDeSerial = new BookConfigDeSerial(fileInputStream);
				BookConfigModel bookConfig = bookConfigDeSerial.getBookConfig();
				java.lang.System.@out.println(bookConfig.getContentPageIndex());
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_003D;
			}
			return;
			IL_003D:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x0400014A RID: 330
		private string serialFile;

		// Token: 0x0400014B RID: 331
		private InputStream inputStream;

		// Token: 0x0400014C RID: 332
		private ObjectInputStream objInputStream;
	}
}
