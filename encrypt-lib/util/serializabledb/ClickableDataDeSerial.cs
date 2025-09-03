using System;
using System.Runtime.CompilerServices;
using com.edc.classbook.model;
using IKVM.Attributes;
using IKVM.Runtime;
using java.io;
using java.lang;
using java.util;

namespace com.edc.classbook.util.serializabledb
{
	// Token: 0x02000066 RID: 102
	public class ClickableDataDeSerial : Object
	{
		// Token: 0x06000383 RID: 899 RVA: 0x0001305C File Offset: 0x0001125C
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[] { 159, 189, 232, 37, 103, 135, 231, 89, 135 })]
		[MethodImpl(8)]
		public ClickableDataDeSerial(InputStream input)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.pageObjectsClickable = null;
			this.inputStream = input;
		}

		// Token: 0x06000384 RID: 900 RVA: 0x00013090 File Offset: 0x00011290
		[Signature("()Ljava/util/Hashtable<Ljava/lang/String;Ljava/util/ArrayList<Lcom/edc/classbook/model/ClickModel;>;>;")]
		[LineNumberTable(new byte[]
		{
			50, 198, 118, 255, 4, 72, 191, 3, 2, 97,
			102, 230, 61, 191, 5, 5, 98, 135, 233, 55,
			98, 203, 191, 5, 2, 97, 102, 227, 61, 191,
			5, 2, 98, 135, 98
		})]
		[MethodImpl(8)]
		public virtual Hashtable getAllClickableData()
		{
			Hashtable hashtable = new Hashtable();
			Exception ex3;
			try
			{
				try
				{
					ObjectInputStream.__<clinit>();
					this.objInputStream = new ObjectInputStream(this.inputStream);
					hashtable = (Hashtable)this.objInputStream.readObject();
				}
				catch (Exception ex)
				{
					Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
					if (ex2 == null)
					{
						throw;
					}
					ex3 = ex2;
					goto IL_006D;
				}
			}
			catch
			{
				Exception ex6;
				try
				{
					this.objInputStream.close();
				}
				catch (Exception ex4)
				{
					Exception ex5 = ByteCodeHelper.MapException<Exception>(ex4, ByteCodeHelper.MapFlags.None);
					if (ex5 == null)
					{
						throw;
					}
					ex6 = ex5;
					goto IL_005E;
				}
				goto IL_006A;
				IL_005E:
				Exception ex7 = ex6;
				Throwable.instancehelper_printStackTrace(ex7);
				IL_006A:
				throw;
			}
			Exception ex10;
			try
			{
				this.objInputStream.close();
			}
			catch (Exception ex8)
			{
				Exception ex9 = ByteCodeHelper.MapException<Exception>(ex8, ByteCodeHelper.MapFlags.None);
				if (ex9 == null)
				{
					throw;
				}
				ex10 = ex9;
				goto IL_0090;
			}
			return hashtable;
			IL_0090:
			Exception ex11 = ex10;
			Throwable.instancehelper_printStackTrace(ex11);
			return hashtable;
			IL_006D:
			Exception ex12 = ex3;
			try
			{
				ex11 = ex12;
				Throwable.instancehelper_printStackTrace(ex11);
			}
			catch
			{
				try
				{
					this.objInputStream.close();
				}
				catch (Exception ex13)
				{
					Exception ex14 = ByteCodeHelper.MapException<Exception>(ex13, ByteCodeHelper.MapFlags.None);
					if (ex14 == null)
					{
						throw;
					}
					ex12 = ex14;
					goto IL_00D8;
				}
				goto IL_00E5;
				IL_00D8:
				Exception ex7 = ex12;
				Throwable.instancehelper_printStackTrace(ex7);
				IL_00E5:
				throw;
			}
			Exception ex17;
			try
			{
				this.objInputStream.close();
			}
			catch (Exception ex15)
			{
				Exception ex16 = ByteCodeHelper.MapException<Exception>(ex15, ByteCodeHelper.MapFlags.None);
				if (ex16 == null)
				{
					throw;
				}
				ex17 = ex16;
				goto IL_0108;
			}
			return hashtable;
			IL_0108:
			ex11 = ex17;
			Throwable.instancehelper_printStackTrace(ex11);
			return hashtable;
		}

		// Token: 0x06000385 RID: 901 RVA: 0x00013210 File Offset: 0x00011410
		[Throws(new string[] { "java.lang.Exception" })]
		[LineNumberTable(new byte[]
		{
			159, 177, 232, 49, 103, 135, 231, 77, 103, 118,
			107
		})]
		[MethodImpl(8)]
		public ClickableDataDeSerial(string serialFile)
		{
			this.inputStream = null;
			this.objInputStream = null;
			this.pageObjectsClickable = null;
			this.serialFile = serialFile;
			FileInputStream.__<clinit>();
			this.inputStream = new FileInputStream(this.serialFile);
			this.pageSeq = new Hashtable();
		}

		// Token: 0x06000386 RID: 902 RVA: 0x00013262 File Offset: 0x00011462
		public virtual void setSerialFile(string serialFile)
		{
			this.serialFile = serialFile;
		}

		// Token: 0x06000387 RID: 903 RVA: 0x0001326B File Offset: 0x0001146B
		public virtual string getSerialFile()
		{
			return this.serialFile;
		}

		// Token: 0x06000388 RID: 904 RVA: 0x00013274 File Offset: 0x00011474
		[LineNumberTable(new byte[]
		{
			160, 106, 240, 78, 135, 113, 127, 0, 255, 95,
			72, 2, 98, 135
		})]
		[MethodImpl(8)]
		public static void main(string[] args)
		{
			Exception ex3;
			try
			{
				ClickableDataDeSerial clickableDataDeSerial = new ClickableDataDeSerial(new FileInputStream("E:\\TVB\\ClassBook\\BOOK20121028\\pack\\GK07ANMT07\\data\\bookdata\\clickable.clsb"));
				Hashtable allClickableData = clickableDataDeSerial.getAllClickableData();
				ArrayList arrayList = (ArrayList)allClickableData.get("12");
				Iterator iterator = arrayList.iterator();
				while (iterator.hasNext())
				{
					ClickModel clickModel = (ClickModel)iterator.next();
					java.lang.System.@out.println(new StringBuilder().append(clickModel.getId()).append(" ").append(clickModel.getClickable_type())
						.append(" ")
						.append(clickModel.getPage_index())
						.append(" ")
						.append(clickModel.getFile_path())
						.toString());
				}
			}
			catch (Exception ex)
			{
				Exception ex2 = ByteCodeHelper.MapException<Exception>(ex, ByteCodeHelper.MapFlags.None);
				if (ex2 == null)
				{
					throw;
				}
				ex3 = ex2;
				goto IL_00C1;
			}
			return;
			IL_00C1:
			Exception ex4 = ex3;
			Throwable.instancehelper_printStackTrace(ex4);
		}

		// Token: 0x06000389 RID: 905 RVA: 0x00013364 File Offset: 0x00011564
		public virtual void setInputStream(InputStream inputStream)
		{
			this.inputStream = inputStream;
		}

		// Token: 0x0600038A RID: 906 RVA: 0x0001336D File Offset: 0x0001156D
		public virtual InputStream getInputStream()
		{
			return this.inputStream;
		}

		// Token: 0x04000157 RID: 343
		private string serialFile;

		// Token: 0x04000158 RID: 344
		private InputStream inputStream;

		// Token: 0x04000159 RID: 345
		private ObjectInputStream objInputStream;

		// Token: 0x0400015A RID: 346
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/lang/String;>;")]
		private Hashtable pageObjectsClickable;

		// Token: 0x0400015B RID: 347
		[Signature("Ljava/util/Hashtable<Ljava/lang/String;Ljava/lang/String;>;")]
		private Hashtable pageSeq;
	}
}
